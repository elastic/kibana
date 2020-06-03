/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subscription } from 'rxjs';
import { HttpServiceSetup, ILegacyClusterClient, Logger } from '../../../../../src/core/server';
import { SecurityAuditLogger } from '../audit';
import { ConfigType } from '../config';
import { OnlineStatusRetryScheduler } from '../elasticsearch';
import { SessionCookie } from './session_cookie';
import { SessionIndex } from './session_index';
import { Session } from './session';

export interface SessionManagementServiceSetupParams {
  readonly auditLogger: SecurityAuditLogger;
  readonly http: Pick<HttpServiceSetup, 'basePath' | 'createCookieSessionStorageFactory'>;
  readonly config: ConfigType;
  readonly clusterClient: ILegacyClusterClient;
}

export interface SessionManagementServiceStartParams {
  readonly online$: Observable<OnlineStatusRetryScheduler>;
}

export interface SessionManagementServiceSetup {
  readonly session: Session;
}

/**
 * Service responsible for the user session management.
 */
export class SessionManagementService {
  readonly #logger: Logger;
  #statusSubscription?: Subscription;
  #sessionIndex!: SessionIndex;

  constructor(logger: Logger) {
    this.#logger = logger;
  }

  setup({
    auditLogger,
    config,
    clusterClient,
    http,
  }: SessionManagementServiceSetupParams): SessionManagementServiceSetup {
    const serverBasePath = http.basePath.serverBasePath || '/';

    const sessionCookie = new SessionCookie({
      config,
      createCookieSessionStorageFactory: http.createCookieSessionStorageFactory,
      serverBasePath,
      logger: this.#logger.get('cookie'),
    });

    this.#sessionIndex = new SessionIndex({
      config,
      clusterClient,
      serverBasePath,
      logger: this.#logger.get('index'),
    });

    return {
      session: new Session({
        auditLogger,
        serverBasePath,
        logger: this.#logger,
        sessionCookie,
        sessionIndex: this.#sessionIndex,
        config,
      }),
    };
  }

  start({ online$ }: SessionManagementServiceStartParams) {
    this.#statusSubscription = online$.subscribe(async ({ scheduleRetry }) => {
      try {
        await this.#sessionIndex.initialize();
      } catch (err) {
        scheduleRetry();
      }
    });
  }

  stop() {
    if (this.#statusSubscription !== undefined) {
      this.#statusSubscription.unsubscribe();
      this.#statusSubscription = undefined;
    }
  }
}
