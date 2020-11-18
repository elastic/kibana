/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subscription } from 'rxjs';
import {
  HttpServiceSetup,
  ILegacyClusterClient,
  Logger,
  SavedObjectsErrorHelpers,
} from '../../../../../src/core/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../../task_manager/server';
import { ConfigType } from '../config';
import { OnlineStatusRetryScheduler } from '../elasticsearch';
import { SessionCookie } from './session_cookie';
import { SessionIndex } from './session_index';
import { Session } from './session';

export interface SessionManagementServiceSetupParams {
  readonly http: Pick<HttpServiceSetup, 'basePath' | 'createCookieSessionStorageFactory'>;
  readonly config: ConfigType;
  readonly clusterClient: ILegacyClusterClient;
  readonly kibanaIndexName: string;
  readonly taskManager: TaskManagerSetupContract;
}

export interface SessionManagementServiceStartParams {
  readonly online$: Observable<OnlineStatusRetryScheduler>;
  readonly taskManager: TaskManagerStartContract;
}

export interface SessionManagementServiceSetup {
  readonly session: Session;
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
  private config!: ConfigType;
  private isCleanupTaskScheduled = false;

  constructor(private readonly logger: Logger) {}

  setup({
    config,
    clusterClient,
    http,
    kibanaIndexName,
    taskManager,
  }: SessionManagementServiceSetupParams): SessionManagementServiceSetup {
    this.config = config;

    const sessionCookie = new SessionCookie({
      config,
      createCookieSessionStorageFactory: http.createCookieSessionStorageFactory,
      serverBasePath: http.basePath.serverBasePath || '/',
      logger: this.logger.get('cookie'),
    });

    this.sessionIndex = new SessionIndex({
      config,
      clusterClient,
      kibanaIndexName,
      logger: this.logger.get('index'),
    });

    // Register task that will perform periodic session index cleanup.
    taskManager.registerTaskDefinitions({
      [SESSION_INDEX_CLEANUP_TASK_NAME]: {
        title: 'Cleanup expired or invalid user sessions',
        createTaskRunner: () => ({ run: () => this.sessionIndex.cleanUp() }),
      },
    });

    return {
      session: new Session({
        logger: this.logger,
        sessionCookie,
        sessionIndex: this.sessionIndex,
        config,
      }),
    };
  }

  start({ online$, taskManager }: SessionManagementServiceStartParams) {
    this.statusSubscription = online$.subscribe(async ({ scheduleRetry }) => {
      try {
        await Promise.all([this.sessionIndex.initialize(), this.scheduleCleanupTask(taskManager)]);
      } catch (err) {
        scheduleRetry();
      }
    });
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
