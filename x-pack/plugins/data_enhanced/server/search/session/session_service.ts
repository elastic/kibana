/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import moment from 'moment';
import {
  KibanaRequest,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
  ElasticsearchServiceStart,
} from '../../../../../../src/core/server';
import {
  BACKGROUND_SESSION_STORE_DAYS,
  SessionSavedObjectAttributes,
  SavedSessionStatus,
} from '../../../common';
import { BACKGROUND_SESSION_TYPE } from './saved_object';
import { SessionKeys } from './types';
import { SecurityPluginSetup } from '../../../../security/server';
import { updateExpiration } from '..';

export class SessionService {
  constructor(
    private readonly savedObjects: SavedObjectsServiceStart,
    private readonly elasticsearch: ElasticsearchServiceStart,
    private readonly security: SecurityPluginSetup,
    private readonly logger: Logger
  ) {}

  private async getSavedObject(savedObjectClient: SavedObjectsClientContract, sessionId: string) {
    return await savedObjectClient.get<SessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      sessionId
    );
  }

  private async createSavedObject(
    savedObjectClient: SavedObjectsClientContract,
    sessionId: string,
    searchIdMapping: Record<string, string> = {}
  ) {
    return await savedObjectClient.create<SessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      {
        sessionId,
        creation: moment().toISOString(),
        expiration: moment().add(BACKGROUND_SESSION_STORE_DAYS, 'd').toISOString(),
        idMapping: searchIdMapping,
        status: SavedSessionStatus.Running,
      },
      {
        id: sessionId,
        overwrite: false,
      }
    );
  }

  private async updateBackgroundSession(
    request: KibanaRequest,
    sessionSavedObject: SavedObject<SessionSavedObjectAttributes>,
    searchIdMapping: Record<string, string>
  ) {
    const savedObjectsClient = this.savedObjects.getScopedClient(request);

    try {
      this.logger.debug(`${sessionSavedObject.id} Updating mapping`);
      const requests = {
        ...sessionSavedObject.attributes.idMapping,
        ...searchIdMapping,
      };

      // Handle the case where multiple servers attempt to update the background session.
      const res = await savedObjectsClient.update(
        BACKGROUND_SESSION_TYPE,
        sessionSavedObject.id,
        {
          idMapping: requests,
        },
        {
          version: sessionSavedObject.version,
        }
      );

      if (res && !res.error) {
        return this.updateExpiration(request, Object.values(searchIdMapping));
      } else {
        this.logger.debug(`${sessionSavedObject.id} Error during update.`);
        return false;
      }
    } catch (e) {
      this.logger.debug(`${sessionSavedObject.id} Failed to update.`);
      return false;
    }
  }

  private getKey(requestParams: SessionKeys): string {
    return createHash(`md5`).update(JSON.stringify(requestParams)).digest('hex');
  }

  private updateExpiration(request: KibanaRequest, searchIds: string[]) {
    const esClient = this.elasticsearch.client.asScoped(request).asCurrentUser;
    return searchIds.every((searchId: string) => {
      const updateSuccess = updateExpiration(esClient, searchId);
      if (!updateSuccess) {
        this.logger.error(`Failed to extend expiration of ${searchId}`);
      } else {
        this.logger.debug(`Extended expiration of ${searchId}`);
      }

      return updateSuccess;
    });
  }

  /**
   * Create a saved object for the provided session ID.
   * Search IDs are synced into the object asynchronously.
   * @param request
   * @param sessionId
   */
  public async store(
    request: KibanaRequest,
    sessionId: string,
    searchIdMapping?: Record<string, string>
  ) {
    this.logger.debug(`${sessionId} Storing`);
    const savedObjectsClient = this.savedObjects.getScopedClient(request);
    const so = await this.createSavedObject(savedObjectsClient, sessionId, searchIdMapping);
    if (so && searchIdMapping) {
      this.updateExpiration(request, Object.values(searchIdMapping));
    }

    return so;
  }

  /**
   * Track a single search ID, corresponding with the provided session ID and request parameters.
   * @param request
   * @param sessionId
   * @param requestParams
   * @param searchId
   */

  public async trackId(
    request: KibanaRequest,
    sessionId: string,
    requestParams: SessionKeys,
    searchId: string
  ) {
    this.logger.debug(`${sessionId} trackId ${searchId}`);
    const backgroundSession = await this.get(request, sessionId);

    if (backgroundSession) {
      const reqHashKey = this.getKey(requestParams);
      return await this.updateBackgroundSession(request, backgroundSession, {
        [reqHashKey]: searchId,
      });
    }

    return false;
  }

  /**
   * Attempt to retrieve a BackgroundSession corresponding to a specific session ID.
   * @param request
   * @param sessionId
   */
  public async get(request: KibanaRequest, sessionId: string) {
    try {
      const savedObjectsClient = this.savedObjects.getScopedClient(request);
      return await this.getSavedObject(savedObjectsClient, sessionId);
    } catch (e) {
      return undefined;
    }
  }

  /**
   * Attempt to retrieve a search ID corresponding to a session ID and request parameters
   * @param request
   * @param sessionId
   * @param requestParams
   */
  public async getId(request: KibanaRequest, sessionId: string, requestParams: SessionKeys) {
    try {
      this.logger.debug(`${sessionId} Checking.`);
      const user = this.security.authc.getCurrentUser(request);
      const bgSavedObject = await this.get(request, sessionId);
      if (!bgSavedObject || !user) {
        return undefined;
      } else {
        const reqHashKey = this.getKey(requestParams);
        const reqId = bgSavedObject.attributes.idMapping[reqHashKey];
        this.logger.debug(`${sessionId} Object found. ${reqHashKey} request ID is ${reqId}`);
        return reqId;
      }
    } catch (e) {
      return undefined;
    }
  }
}

export type ISessionService = PublicMethodsOf<SessionService>;
