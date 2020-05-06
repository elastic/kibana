/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import moment from 'moment';
import {
  Logger,
  SavedObject,
  SavedObjectsClient,
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

const INMEM_TRACKING_TIMEOUT_SEC = 60;
const INMEM_TRACKING_INTERVAL = 10000;

export class BackgroundSessionService {
  private readonly idMapping!: Map<string, SessionInfo>;
  private readonly monitorInterval!: NodeJS.Timeout;
  private readonly internalSavedObjectsClient!: SavedObjectsClientContract;

  constructor(
    savedObjects: SavedObjectsServiceStart,
    private readonly updateExpirationHandler: (searchId: string) => void,
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

  private async monitorMappedIds() {
    if (!this.idMapping.size) return;
    const activeMappingObjects = await this.getAllMappedSavedObjects();
    const curTime = moment();

    this.logger.debug(`Fetching ${this.idMapping.size} background sessions`);

    this.idMapping.forEach((sessionInfo, sessionId) => {
      const sessionSavedObject = activeMappingObjects.saved_objects.find(
        (r: SavedObject<BackgroundSessionSavedObjectAttributes>) =>
          r.attributes && r.attributes.sessionId && r.attributes.sessionId === sessionId
      );
      if (sessionSavedObject) {
        this.logger.debug(`Update session ${sessionId}`);
        this.updateBackgroundSession(sessionSavedObject, sessionInfo);
        this.idMapping.delete(sessionId);
      } else if (
        moment.duration(curTime.diff(sessionInfo.insertTime)).asSeconds() >=
        INMEM_TRACKING_TIMEOUT_SEC
      ) {
        this.logger.debug(`Timeout session ${sessionId}`);
        this.idMapping.delete(sessionId);
      }
    });
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
      this.logger.debug(`Updating background session ${sessionSavedObject.id}`);
      const requests = {
        ...sessionSavedObject.attributes.idMapping,
        ...Object.fromEntries(sessionInfo.requests),
      };
      const version = sessionSavedObject.version ? sessionSavedObject.version + 1 : '1';
      const res = await this.internalSavedObjectsClient.update(
        BACKGROUND_SESSION_TYPE,
        sessionSavedObject.id,
        {
          idMapping: requests,
        },
        {
          version,
        }
      );
      if (res && !res.error) {
        sessionInfo.requests.forEach(searchId => {
          this.updateExpirationHandler(searchId);
        });
      }
    } catch (e) {
      // TODO: handle error
    }
  }

  private getKey(userId: string, requestParams: any): string {
    return createHash(`md5`)
      .update(JSON.stringify({ uid: userId, req: requestParams }))
      .digest('hex');
  }

  public async store(savedObjectClient: SavedObjectsClientContract, sessionId: string) {
    return await this.createSavedObject(savedObjectClient, sessionId);
  }

  public trackId(userId: string, sessionId: string, requestParams: any, searchId: string) {
    this.logger.debug(`trackId ${searchId} (user ${userId} | sess ${sessionId}`);
    // console.log(`trackId ${searchId} (user ${userId} | sess ${sessionId}`);
    const reqHashKey = this.getKey(userId, requestParams);
    let sessionIdsInfo = this.idMapping.get(sessionId);
    if (!sessionIdsInfo) {
      sessionIdsInfo = {
        userId,
        requests: new Map(),
        insertTime: moment(),
      };
    }
    sessionIdsInfo.requests.set(reqHashKey, searchId);
    // possible race condition - setting a new id while monitor saves and deletes them!
    this.idMapping.set(sessionId, sessionIdsInfo);
  }

  public async getId(
    savedObjectClient: SavedObjectsClientContract,
    userId: string,
    sessionId: string,
    requestParams: any
  ) {
    const bgSavedObject = await this.getSavedObject(savedObjectClient, sessionId);
    if (!bgSavedObject) {
      return undefined;
    } else {
      // const reqHashKey = this.getKey(userId, requestParams);
      return '';
    }
  }
}
