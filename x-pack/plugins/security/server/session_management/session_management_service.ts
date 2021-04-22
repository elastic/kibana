/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subscription } from 'rxjs';

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ElasticsearchClient, HttpServiceSetup, KibanaRequest, Logger } from 'src/core/server';

import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../task_manager/server';
import type { ConfigType } from '../config';
import type { OnlineStatusRetryScheduler } from '../elasticsearch';
import { Session } from './session';
import { SessionCookie } from './session_cookie';
import { SessionIndex } from './session_index';
import type { SessionUserDataStorage } from './session_user_data_storage';
import { SessionUserDataStorageService } from './session_user_data_storage_service';
import type { SessionUserDataStorageScope } from './session_user_data_storage_service';

export interface SessionManagementServiceSetupParams {
  readonly http: Pick<HttpServiceSetup, 'basePath' | 'createCookieSessionStorageFactory'>;
  readonly config: ConfigType;
  readonly taskManager: TaskManagerSetupContract;
}

export interface SessionManagementServiceStartParams {
  readonly elasticsearchClient: ElasticsearchClient;
  readonly kibanaIndexName: string;
  readonly online$: Observable<OnlineStatusRetryScheduler>;
  readonly taskManager: TaskManagerStartContract;
}

export interface SessionManagementServiceSetup {
  readonly userData: {
    registerScope: (scopePrefix: string) => SessionUserDataStorageScope;
  };
}

export interface SessionManagementServiceStart {
  readonly session: Session;
  readonly hasActiveSession: (request: KibanaRequest) => Promise<boolean>;
  readonly userData: {
    getStorage: (scope: SessionUserDataStorageScope) => PublicMethodsOf<SessionUserDataStorage>;
  };
}

/**
 * Name of the task that is periodically run and performs session index cleanup.
 */
export const SESSION_INDEX_CLEANUP_TASK_NAME = 'session_cleanup';

/**
 * Service responsible for the user session management.
 */
export class SessionManagementService {
  private statusSubscription?: Subscription;
  private sessionIndex!: SessionIndex;
  private sessionCookie!: SessionCookie;
  private config!: ConfigType;
  private readonly sessionUserDataStorageService = new SessionUserDataStorageService(this.logger);
  private isCleanupTaskScheduled = false;

  constructor(private readonly logger: Logger) {}

  setup({
    config,
    http,
    taskManager,
  }: SessionManagementServiceSetupParams): SessionManagementServiceSetup {
    this.config = config;

    this.sessionCookie = new SessionCookie({
      config,
      createCookieSessionStorageFactory: http.createCookieSessionStorageFactory,
      serverBasePath: http.basePath.serverBasePath || '/',
      logger: this.logger.get('cookie'),
    });

    // Register task that will perform periodic session index cleanup.
    taskManager.registerTaskDefinitions({
      [SESSION_INDEX_CLEANUP_TASK_NAME]: {
        title: 'Cleanup expired or invalid user sessions',
        createTaskRunner: () => ({ run: () => this.sessionIndex.cleanUp() }),
      },
    });

    return {
      userData: {
        registerScope: this.sessionUserDataStorageService.registerScope.bind(
          this.sessionUserDataStorageService
        ),
      },
    };
  }

  start({
    elasticsearchClient,
    kibanaIndexName,
    online$,
    taskManager,
  }: SessionManagementServiceStartParams): SessionManagementServiceStart {
    this.sessionIndex = new SessionIndex({
      config: this.config,
      elasticsearchClient,
      kibanaIndexName,
      logger: this.logger.get('index'),
    });

    this.statusSubscription = online$.subscribe(async ({ scheduleRetry }) => {
      try {
        await Promise.all([this.sessionIndex.initialize(), this.scheduleCleanupTask(taskManager)]);
      } catch (err) {
        scheduleRetry();
      }
    });

    const session = new Session({
      logger: this.logger,
      sessionCookie: this.sessionCookie,
      sessionIndex: this.sessionIndex,
      config: this.config,
    });

    return {
      session,
      hasActiveSession: (request: KibanaRequest) =>
        session.get(request).then((value) => value != null),
      userData: {
        getStorage: this.sessionUserDataStorageService.getStorage.bind(
          this.sessionUserDataStorageService,
          session
        ),
      },
    };
  }

  stop() {
    if (this.statusSubscription !== undefined) {
      this.statusSubscription.unsubscribe();
      this.statusSubscription = undefined;
    }
  }

  private async scheduleCleanupTask(taskManager: TaskManagerStartContract) {
    let currentTask;
    try {
      currentTask = await taskManager.get(SESSION_INDEX_CLEANUP_TASK_NAME);
    } catch (err) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
        this.logger.error(`Failed to retrieve session index cleanup task: ${err.message}`);
        throw err;
      }

      this.logger.debug('Session index cleanup task is not scheduled yet.');
    }

    // Check if currently scheduled task is scheduled with the correct interval.
    const cleanupInterval = `${this.config.session.cleanupInterval.asSeconds()}s`;
    if (currentTask) {
      if (currentTask.schedule?.interval === cleanupInterval) {
        this.logger.debug('Session index cleanup task is already scheduled.');
        return;
      }

      this.logger.debug(
        'Session index cleanup interval has changed, the cleanup task will be rescheduled.'
      );

      try {
        await taskManager.remove(SESSION_INDEX_CLEANUP_TASK_NAME);
      } catch (err) {
        // We may have multiple instances of Kibana that are removing old task definition at the
        // same time. If we get 404 here then task was removed by another instance, it's fine.
        if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
          this.logger.error(`Failed to remove old session index cleanup task: ${err.message}`);
          throw err;
        }
      }
    } else if (this.isCleanupTaskScheduled) {
      // WORKAROUND: This is a workaround for the Task Manager issue: https://github.com/elastic/kibana/issues/75501
      // and should be removed as soon as this issue is resolved.
      this.logger.error(
        'Session index cleanup task has been already scheduled, but is missing in the task list for some reason. Please restart Kibana to automatically reschedule this task.'
      );
      return;
    }

    try {
      await taskManager.ensureScheduled({
        id: SESSION_INDEX_CLEANUP_TASK_NAME,
        taskType: SESSION_INDEX_CLEANUP_TASK_NAME,
        scope: ['security'],
        schedule: { interval: cleanupInterval },
        params: {},
        state: {},
      });
    } catch (err) {
      this.logger.error(`Failed to schedule session index cleanup task: ${err.message}`);
      throw err;
    }

    this.isCleanupTaskScheduled = true;
    this.logger.debug('Successfully scheduled session index cleanup task.');
  }
}
