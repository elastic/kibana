/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subscription } from 'rxjs';
import { createHash } from 'crypto';
import { HttpServiceSetup, ILegacyClusterClient, Logger } from '../../../../../src/core/server';
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
      // Unique identifier of Kibana "tenant" based on the .kibana index name it relies on.
      tenant: createHash('sha3-256').update(kibanaIndexName).digest('hex'),
      logger: this.logger.get('index'),
    });

    // Register task that will perform periodic session index cleanup.
    taskManager.registerTaskDefinitions({
      [SESSION_INDEX_CLEANUP_TASK_NAME]: {
        title: 'Cleanup expired or invalid sessions',
        type: SESSION_INDEX_CLEANUP_TASK_NAME,
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
        await this.sessionIndex.initialize();
      } catch (err) {
        scheduleRetry();
      }
    });

    taskManager
      .ensureScheduled({
        id: SESSION_INDEX_CLEANUP_TASK_NAME,
        taskType: SESSION_INDEX_CLEANUP_TASK_NAME,
        scope: ['security'],
        schedule: { interval: `${this.config.session.cleanupInterval.asSeconds()}s` },
        params: {},
        state: {},
      })
      .then(
        () => this.logger.debug('Successfully scheduled session index cleanup task.'),
        (err) => this.logger.error(`Failed to register session index cleanup task: ${err.message}`)
      );
  }

  stop() {
    if (this.statusSubscription !== undefined) {
      this.statusSubscription.unsubscribe();
      this.statusSubscription = undefined;
    }
  }
}
