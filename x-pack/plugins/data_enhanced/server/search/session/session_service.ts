/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment, { Moment } from 'moment';
import { from, Observable } from 'rxjs';
import { first, switchMap } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  SavedObject,
  SavedObjectsClient,
  SavedObjectsClientContract,
} from '../../../../../../src/core/server';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchClient,
  ISearchOptions,
  tapFirst,
} from '../../../../../../src/plugins/data/common';
import {
  ISessionService,
  ISessionServiceDependencies,
} from '../../../../../../src/plugins/data/server';
import {
  BackgroundSessionFindOptions,
  BackgroundSessionSavedObjectAttributes,
  BackgroundSessionStatus,
} from '../../../common';
import { BACKGROUND_SESSION_TYPE } from '../../saved_objects';
import { createRequestHash } from './utils';
import { ConfigSchema } from '../../../config';
import { DataEnhancedPluginsStart } from '../../plugin';

const INMEM_MAX_SESSIONS = 10000;
const DEFAULT_EXPIRATION = 7 * 24 * 60 * 60 * 1000;
export const INMEM_TRACKING_INTERVAL = 10 * 1000;
export const INMEM_TRACKING_TIMEOUT_SEC = 60;
export const MAX_UPDATE_RETRIES = 3;

export interface BackgroundSessionDependencies extends ISessionServiceDependencies {
  savedObjectsClient: SavedObjectsClientContract;
}

export interface SessionInfo {
  insertTime: Moment;
  retryCount: number;
  ids: Map<string, string>;
}

export type BackgroundSessionClient = ReturnType<
  ReturnType<BackgroundSessionService['asScopedProvider']>
>;

export class BackgroundSessionService implements ISessionService<BackgroundSessionClient> {
  /**
   * Map of sessionId to { [requestHash]: searchId }
   * @private
   */
  private sessionSearchMap = new Map<string, SessionInfo>();
  private internalSavedObjectsClient!: SavedObjectsClientContract;
  private monitorTimer!: NodeJS.Timeout;
  protected searchAsScoped!: (request: KibanaRequest) => ISearchClient;

  constructor(private readonly logger: Logger) {}

  public setup(core: CoreSetup<DataEnhancedPluginsStart>) {
    core.getStartServices().then(([, { data }]) => {
      this.searchAsScoped = data.search.asScoped;
    });
  }

  public start(core: CoreStart, config$: Observable<ConfigSchema>) {
    this.setupMonitoring(core, config$);
  }

  public stop() {
    this.sessionSearchMap.clear();
    clearTimeout(this.monitorTimer);
  }

  private async setupMonitoring(core: CoreStart, config$: Observable<ConfigSchema>) {
    const config = await config$.pipe(first()).toPromise();
    if (config.search.sendToBackground.enabled) {
      this.logger.debug(`setupMonitoring | Enabling monitoring`);
      const internalRepo = core.savedObjects.createInternalRepository([BACKGROUND_SESSION_TYPE]);
      this.internalSavedObjectsClient = new SavedObjectsClient(internalRepo);
      this.monitorMappedIds();
    }
  }

  /**
   * Gets all {@link SessionSavedObjectAttributes | Background Searches} that
   * currently being tracked by the service.
   *
   * @remarks
   * Uses `internalSavedObjectsClient` as this is called asynchronously, not within the
   * context of a user's session.
   */
  private async getAllMappedSavedObjects() {
    const activeMappingIds = Array.from(this.sessionSearchMap.keys())
      .map((sessionId) => `"${sessionId}"`)
      .join(' | ');
    const res = await this.internalSavedObjectsClient.find<BackgroundSessionSavedObjectAttributes>({
      perPage: INMEM_MAX_SESSIONS, // If there are more sessions in memory, they will be synced when some items are cleared out.
      type: BACKGROUND_SESSION_TYPE,
      search: activeMappingIds,
      searchFields: ['sessionId'],
      namespaces: ['*'],
    });
    this.logger.debug(`getAllMappedSavedObjects | Got ${res.saved_objects.length} items`);
    return res.saved_objects;
  }

  private clearSessions() {
    const curTime = moment();

    this.sessionSearchMap.forEach((sessionInfo, sessionId) => {
      if (
        moment.duration(curTime.diff(sessionInfo.insertTime)).asSeconds() >
        INMEM_TRACKING_TIMEOUT_SEC
      ) {
        this.logger.debug(`clearSessions | Deleting expired session ${sessionId}`);
        this.sessionSearchMap.delete(sessionId);
      } else if (sessionInfo.retryCount >= MAX_UPDATE_RETRIES) {
        this.logger.warn(`clearSessions | Deleting failed session ${sessionId}`);
        this.sessionSearchMap.delete(sessionId);
      }
    });
  }

  private async monitorMappedIds() {
    this.monitorTimer = setTimeout(async () => {
      try {
        this.clearSessions();

        if (!this.sessionSearchMap.size) return;
        this.logger.debug(`monitorMappedIds | Map contains ${this.sessionSearchMap.size} items`);

        const savedSessions = await this.getAllMappedSavedObjects();
        const updatedSessions = await this.updateAllSavedObjects(savedSessions);

        updatedSessions.forEach((updatedSavedObject) => {
          const sessionInfo = this.sessionSearchMap.get(updatedSavedObject.id)!;
          if (updatedSavedObject.error) {
            // Retry next time
            sessionInfo.retryCount++;
          } else if (updatedSavedObject.attributes.idMapping) {
            // Delete the ids that we just saved, avoiding a potential new ids being lost.
            Object.keys(updatedSavedObject.attributes.idMapping).forEach((key) => {
              sessionInfo.ids.delete(key);
            });
            // If the session object is empty, delete it as well
            if (!sessionInfo.ids.entries.length) {
              this.sessionSearchMap.delete(updatedSavedObject.id);
            } else {
              sessionInfo.retryCount = 0;
            }
          }
        });
      } catch (e) {
        this.logger.error(`monitorMappedIds | Error while updating sessions. ${e}`);
      } finally {
        this.monitorMappedIds();
      }
    }, INMEM_TRACKING_INTERVAL);
  }

  private async updateAllSavedObjects(
    activeMappingObjects: Array<SavedObject<BackgroundSessionSavedObjectAttributes>>
  ) {
    if (!activeMappingObjects.length) return [];

    this.logger.debug(`updateAllSavedObjects | Updating ${activeMappingObjects.length} items`);
    const updatedSessions = activeMappingObjects
      .filter((so) => !so.error)
      .map((sessionSavedObject) => {
        const sessionInfo = this.sessionSearchMap.get(sessionSavedObject.id);
        const idMapping = sessionInfo ? Object.fromEntries(sessionInfo.ids.entries()) : {};
        sessionSavedObject.attributes.idMapping = {
          ...sessionSavedObject.attributes.idMapping,
          ...idMapping,
        };
        return sessionSavedObject;
      });

    const updateResults = await this.internalSavedObjectsClient.bulkUpdate<BackgroundSessionSavedObjectAttributes>(
      updatedSessions
    );
    return updateResults.saved_objects;
  }

  public search<Request extends IKibanaSearchRequest, Response extends IKibanaSearchResponse>(
    deps: BackgroundSessionDependencies,
    searchRequest: Request,
    options: ISearchOptions = {}
  ): Observable<Response> {
    const { sessionId, ...otherOptions } = options;

    // If this is a restored background search session, look up the ID using the provided sessionId
    const getSearchRequest = async () =>
      !options.isRestore || searchRequest.id
        ? searchRequest
        : {
            ...searchRequest,
            id: await this.getId(deps, searchRequest, options),
          };

    return from(getSearchRequest()).pipe(
      switchMap((request) => deps.searchClient.search<Request, Response>(request, otherOptions)),
      tapFirst((response) => {
        if (searchRequest.id || !sessionId || !response.id || options.isRestore) return;
        this.trackId(deps, searchRequest, response.id, options);
      })
    );
  }

  public cancel(
    deps: BackgroundSessionDependencies,
    searchId: string,
    { sessionId, ...options }: ISearchOptions = {}
  ) {
    if (sessionId && this.sessionSearchMap.has(sessionId)) {
      const map = this.sessionSearchMap.get(sessionId)!;
      map.ids.forEach((value, key) => {
        if (value === searchId) map.ids.delete(key);
      });
    }
    return deps.searchClient.cancel(searchId, options);
  }

  // TODO: Generate the `userId` from the realm type/realm name/username
  public async save(
    { savedObjectsClient }: BackgroundSessionDependencies,
    sessionId: string,
    {
      name,
      appId,
      created = new Date().toISOString(),
      expires = new Date(Date.now() + DEFAULT_EXPIRATION).toISOString(),
      status = BackgroundSessionStatus.IN_PROGRESS,
      urlGeneratorId,
      initialState = {},
      restoreState = {},
    }: Partial<BackgroundSessionSavedObjectAttributes>
  ) {
    if (!name) throw new Error('Name is required');
    if (!appId) throw new Error('AppId is required');
    if (!urlGeneratorId) throw new Error('UrlGeneratorId is required');

    this.logger.debug(`save | ${sessionId}`);

    const attributes = {
      name,
      created,
      expires,
      status,
      initialState,
      restoreState,
      idMapping: {},
      urlGeneratorId,
      appId,
      sessionId,
    };
    const session = await savedObjectsClient.create<BackgroundSessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      attributes,
      { id: sessionId }
    );

    return session;
  }

  // TODO: Throw an error if this session doesn't belong to this user
  public get({ savedObjectsClient }: BackgroundSessionDependencies, sessionId: string) {
    this.logger.debug(`get | ${sessionId}`);
    return savedObjectsClient.get<BackgroundSessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      sessionId
    );
  }

  // TODO: Throw an error if this session doesn't belong to this user
  public find(
    { savedObjectsClient }: BackgroundSessionDependencies,
    options: BackgroundSessionFindOptions
  ) {
    return savedObjectsClient.find<BackgroundSessionSavedObjectAttributes>({
      ...options,
      type: BACKGROUND_SESSION_TYPE,
    });
  }

  // TODO: Throw an error if this session doesn't belong to this user
  public update(
    { savedObjectsClient }: BackgroundSessionDependencies,
    sessionId: string,
    attributes: Partial<BackgroundSessionSavedObjectAttributes>
  ) {
    this.logger.debug(`update | ${sessionId}`);
    return savedObjectsClient.update<BackgroundSessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      sessionId,
      attributes
    );
  }

  // TODO: Throw an error if this session doesn't belong to this user
  public delete({ savedObjectsClient }: BackgroundSessionDependencies, sessionId: string) {
    return savedObjectsClient.delete(BACKGROUND_SESSION_TYPE, sessionId);
  }

  /**
   * Tracks the given search request/search ID in the saved session (if it exists). Otherwise, just
   * store it in memory until a saved session exists.
   * @internal
   */
  public async trackId(
    deps: BackgroundSessionDependencies,
    searchRequest: IKibanaSearchRequest,
    searchId: string,
    { sessionId, isStored }: ISearchOptions
  ) {
    if (!sessionId || !searchId) return;
    this.logger.debug(`trackId | ${sessionId} | ${searchId}`);
    const requestHash = createRequestHash(searchRequest.params);

    // If there is already a saved object for this session, update it to include this request/ID.
    // Otherwise, just update the in-memory mapping for this session for when the session is saved.
    if (isStored) {
      const attributes = { idMapping: { [requestHash]: searchId } };
      await this.update(deps, sessionId, attributes);
    } else {
      const map = this.sessionSearchMap.get(sessionId) ?? {
        insertTime: moment(),
        retryCount: 0,
        ids: new Map<string, string>(),
      };
      map.ids.set(requestHash, searchId);
      this.sessionSearchMap.set(sessionId, map);
    }
  }

  /**
   * Look up an existing search ID that matches the given request in the given session so that the
   * request can continue rather than restart.
   * @internal
   */
  public getId = async (
    deps: BackgroundSessionDependencies,
    searchRequest: IKibanaSearchRequest,
    { sessionId, isStored, isRestore }: ISearchOptions
  ) => {
    if (!sessionId) {
      throw new Error('Session ID is required');
    } else if (!isStored) {
      throw new Error('Cannot get search ID from a session that is not stored');
    } else if (!isRestore) {
      throw new Error('Get search ID is only supported when restoring a session');
    }

    const session = await this.get(deps, sessionId);
    const requestHash = createRequestHash(searchRequest.params);
    if (!session.attributes.idMapping.hasOwnProperty(requestHash)) {
      throw new Error('No search ID in this session matching the given search request');
    }

    return session.attributes.idMapping[requestHash];
  };

  public asScopedProvider({ savedObjects }: CoreStart) {
    return (request: KibanaRequest) => {
      const savedObjectsClient = savedObjects.getScopedClient(request, {
        includedHiddenTypes: [BACKGROUND_SESSION_TYPE],
      });
      const searchClient = this.searchAsScoped(request);
      const deps = { savedObjectsClient, searchClient };
      return {
        search: <Request extends IKibanaSearchRequest, Response extends IKibanaSearchResponse>(
          searchRequest: Request,
          options: ISearchOptions = {}
        ) => this.search<Request, Response>(deps, searchRequest, options),
        cancel: this.cancel.bind(this, deps),
        save: this.save.bind(this, deps),
        get: this.get.bind(this, deps),
        find: this.find.bind(this, deps),
        update: this.update.bind(this, deps),
        delete: this.delete.bind(this, deps),
      };
    };
  }
}
