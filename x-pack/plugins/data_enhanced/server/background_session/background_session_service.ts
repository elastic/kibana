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
  SavedObjectsClient,
  SavedObjectsBulkResponse,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from '../../../../../src/core/server';
import {
  BACKGROUND_SESSION_STORE_DAYS,
  BackgroundSessionSavedObjectAttributes,
  BackgroundSessionStatus,
} from '../../common';
import { BACKGROUND_SESSION_TYPE } from './saved_object';
import { SessionInfo } from './types';
import { SecurityPluginSetup } from '../../../security/server';

const INMEM_TRACKING_TIMEOUT_SEC = 60;
const INMEM_TRACKING_INTERVAL = 2000;
const MAX_UPDATE_RETRIES = 3;

export class BackgroundSessionService {
  private readonly idMapping!: Map<string, SessionInfo>;
  private readonly monitorInterval!: NodeJS.Timeout;
  private readonly internalSavedObjectsClient!: SavedObjectsClientContract;

  constructor(
    private readonly savedObjects: SavedObjectsServiceStart,
    private readonly security: SecurityPluginSetup,
    private readonly updateExpirationHandler: (searchId: string) => Promise<any>,
    private readonly logger: Logger
  ) {
    this.idMapping = new Map<string, SessionInfo>();
    const internalRepo = savedObjects.createInternalRepository();
    this.internalSavedObjectsClient = new SavedObjectsClient(internalRepo);
    this.monitorInterval = setInterval(this.monitorMappedIds.bind(this), INMEM_TRACKING_INTERVAL);
  }

  public destroy() {
    clearInterval(this.monitorInterval);
  }

  private async monitorMappedId(
    activeMappingObjects: Array<SavedObject<BackgroundSessionSavedObjectAttributes>> | undefined,
    sessionId: string
  ) {
    const curTime = moment();
    const sessionInfo = this.idMapping.get(sessionId);
    if (!sessionInfo) {
      this.logger.debug(`${sessionId} Can't find session info.`);
      return;
    } else if (sessionInfo.retryCount >= MAX_UPDATE_RETRIES) {
      this.logger.debug(`${sessionId} Too many retries`);
      this.idMapping.delete(sessionId);
      return;
    }
    const sessionSavedObject = activeMappingObjects
      ? await activeMappingObjects.find(
          (r: SavedObject<BackgroundSessionSavedObjectAttributes>) =>
            r.attributes && r.attributes.sessionId && r.attributes.sessionId === sessionId
        )
      : undefined;

    if (sessionSavedObject) {
      this.logger.debug(`${sessionId} Found object. Updating.`);
      const success = await this.updateBackgroundSession(sessionSavedObject, sessionInfo);
      if (success) this.idMapping.delete(sessionId);
    } else if (
      moment.duration(curTime.diff(sessionInfo.insertTime)).asSeconds() >=
      INMEM_TRACKING_TIMEOUT_SEC
    ) {
      this.logger.debug(`${sessionId} Session timeout`);
      this.idMapping.delete(sessionId);
    }
  }

  private async monitorMappedIds() {
    if (!this.idMapping.size) return;
    this.logger.debug(`Fetching ${this.idMapping.size} background sessions`);
    let activeMappingObjects:
      | SavedObjectsBulkResponse<BackgroundSessionSavedObjectAttributes>
      | undefined;
    try {
      activeMappingObjects = await this.getAllMappedSavedObjects();
    } catch (e) {
      this.logger.debug(`Error fetching background sessions. ${e}`);
    }

    const promises = [];
    for (const sessionId of this.idMapping.keys()) {
      promises.push(this.monitorMappedId(activeMappingObjects?.saved_objects, sessionId));
    }

    await Promise.all(promises);
  }

  /**
   * Gets all {@link BackgroundSessionSavedObjectAttributes | Background Searches} that
   * currently being tracked by the service.
   *
   * As most searches do not get send to background, expect the amount of returned objects
   * to be significantly smaller than the amount of IDs sent.
   *
   * @remarks
   * Uses `internalSavedObjectsClient` as this is called asynchronously, not within the
   * context of a user's session.
   */
  private async getAllMappedSavedObjects() {
    const activeMappingIds = Array.from(this.idMapping.keys()).map(sessionId => {
      return {
        id: sessionId,
        type: BACKGROUND_SESSION_TYPE,
      };
    });
    return await this.internalSavedObjectsClient.bulkGet<BackgroundSessionSavedObjectAttributes>(
      activeMappingIds
    );
  }

  private async getSavedObject(savedObjectClient: SavedObjectsClientContract, sessionId: string) {
    return await savedObjectClient.get<BackgroundSessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      sessionId
    );
  }

  private async createSavedObject(
    savedObjectClient: SavedObjectsClientContract,
    sessionId: string
  ) {
    return await savedObjectClient.create<BackgroundSessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      {
        sessionId,
        creation: moment().toISOString(),
        expiration: moment()
          .add(BACKGROUND_SESSION_STORE_DAYS, 'd')
          .toISOString(),
        idMapping: {},
        status: BackgroundSessionStatus.Running,
      },
      {
        id: sessionId,
        overwrite: false,
      }
    );
  }

  private async updateBackgroundSession(
    sessionSavedObject: SavedObject<BackgroundSessionSavedObjectAttributes>,
    sessionInfo: SessionInfo
  ) {
    try {
      this.logger.debug(`${sessionSavedObject.id} Updating mapping`);
      const requests = {
        ...sessionSavedObject.attributes.idMapping,
        ...Object.fromEntries(sessionInfo.requests),
      };

      // TODO: implement concurrency with version
      // const version = Number.parseInt(sessionSavedObject.version)
      //   ? (Number.parseInt(sessionSavedObject.version) + 1).toString()
      //   : '1';
      const res = await this.internalSavedObjectsClient.update(
        BACKGROUND_SESSION_TYPE,
        sessionSavedObject.id,
        {
          idMapping: requests,
        }
      );
      if (res && !res.error) {
        sessionInfo.requests.forEach(async searchId => {
          try {
            const updateResult = await this.updateExpirationHandler(searchId);
          } catch (eUpdate) {
            this.logger.debug(
              `${sessionSavedObject.id} Error during expiration update. C'est la vie.`
            );
          }
        });
        return true;
      } else {
        this.logger.debug(`${sessionSavedObject.id} Error during update. Retry in next interval.`);
        sessionInfo.retryCount++;
        return false;
      }
    } catch (e) {
      this.logger.debug(`${sessionSavedObject.id} Failed to update. Retry in next interval.`);
      sessionInfo.retryCount++;
      return false;
    }
  }

  private getKey(userId: string, requestParams: any): string {
    return createHash(`md5`)
      .update(JSON.stringify({ uid: userId, req: requestParams }))
      .digest('hex');
  }

  public async store(kibanaRequest: KibanaRequest, sessionId: string) {
    this.logger.debug(`${sessionId} Storing`);
    const savedObjectsClient = this.savedObjects.getScopedClient(kibanaRequest);
    return await this.createSavedObject(savedObjectsClient, sessionId);
  }

  public trackId(
    kibanaRequest: KibanaRequest,
    sessionId: string,
    requestParams: any,
    searchId: string
  ) {
    this.logger.debug(`${sessionId} trackId ${searchId}`);
    const user = this.security.authc.getCurrentUser(kibanaRequest);
    if (!user) return;
    const reqHashKey = this.getKey(user.email, requestParams);
    let sessionIdsInfo = this.idMapping.get(sessionId);
    if (!sessionIdsInfo) {
      sessionIdsInfo = {
        userId: user.email,
        requests: new Map(),
        insertTime: moment(),
        retryCount: 0,
      };
    }
    sessionIdsInfo.requests.set(reqHashKey, searchId);
    this.idMapping.set(sessionId, sessionIdsInfo);
  }

  public async get(kibanaRequest: KibanaRequest, sessionId: string) {
    try {
      const savedObjectsClient = this.savedObjects.getScopedClient(kibanaRequest);
      return await this.getSavedObject(savedObjectsClient, sessionId);
    } catch (e) {
      return undefined;
    }
  }

  public async getId(kibanaRequest: KibanaRequest, sessionId: string, requestParams: any) {
    try {
      this.logger.debug(`${sessionId} Checking.`);
      const user = this.security.authc.getCurrentUser(kibanaRequest);
      const bgSavedObject = await this.get(kibanaRequest, sessionId);
      if (!bgSavedObject || !user) {
        return undefined;
      } else {
        const reqHashKey = this.getKey(user.email, requestParams);
        const asyncId = bgSavedObject.attributes.idMapping[reqHashKey];
        this.logger.debug(`${sessionId} Object found. ${reqHashKey} async ID is ${asyncId}`);
        return asyncId;
      }
    } catch (e) {
      return undefined;
    }
  }
}
