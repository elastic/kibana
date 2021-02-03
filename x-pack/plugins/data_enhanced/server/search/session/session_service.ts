/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment, { Moment } from 'moment';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  SavedObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsClient,
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
} from '../../../../../../src/core/server';
import {
  IKibanaSearchRequest,
  ISearchOptions,
  KueryNode,
  nodeBuilder,
} from '../../../../../../src/plugins/data/common';
import { ISearchSessionService } from '../../../../../../src/plugins/data/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../task_manager/server';
import {
  SearchSessionRequestInfo,
  SearchSessionSavedObjectAttributes,
  SearchSessionStatus,
} from '../../../common';
import { SEARCH_SESSION_TYPE } from '../../saved_objects';
import { createRequestHash } from './utils';
import { ConfigSchema } from '../../../config';
import { registerSearchSessionsTask, scheduleSearchSessionsTasks } from './monitoring_task';
import { SearchStatus } from './types';

export interface SearchSessionDependencies {
  savedObjectsClient: SavedObjectsClientContract;
}

export interface SessionInfo {
  insertTime: Moment;
  retryCount: number;
  ids: Map<string, SearchSessionRequestInfo>;
}

interface SetupDependencies {
  taskManager: TaskManagerSetupContract;
}

interface StartDependencies {
  taskManager: TaskManagerStartContract;
}

type SearchSessionsConfig = ConfigSchema['search']['sessions'];

/**
 * @internal
 */
export class SearchSessionService
  implements ISearchSessionService<SearchSessionSavedObjectAttributes> {
  /**
   * Map of sessionId to { [requestHash]: searchId }
   * @private
   */
  private sessionSearchMap = new Map<string, SessionInfo>();
  private internalSavedObjectsClient!: SavedObjectsClientContract;
  private monitorTimer!: NodeJS.Timeout;
  private config!: SearchSessionsConfig;

  constructor(
    private readonly logger: Logger,
    private readonly config$: Observable<ConfigSchema>
  ) {}

  public setup(core: CoreSetup, deps: SetupDependencies) {
    registerSearchSessionsTask(core, {
      config$: this.config$,
      taskManager: deps.taskManager,
      logger: this.logger,
    });
  }

  public async start(core: CoreStart, deps: StartDependencies) {
    const configPromise = await this.config$.pipe(first()).toPromise();
    this.config = (await configPromise).search.sessions;
    return this.setupMonitoring(core, deps);
  }

  public stop() {
    this.sessionSearchMap.clear();
    clearTimeout(this.monitorTimer);
  }

  private setupMonitoring = async (core: CoreStart, deps: StartDependencies) => {
    if (this.config.enabled) {
      scheduleSearchSessionsTasks(deps.taskManager, this.logger, this.config.trackingInterval);
      this.logger.debug(`setupMonitoring | Enabling monitoring`);
      const internalRepo = core.savedObjects.createInternalRepository([SEARCH_SESSION_TYPE]);
      this.internalSavedObjectsClient = new SavedObjectsClient(internalRepo);
      this.monitorMappedIds();
    }
  };

  /**
   * Compiles a KQL Query to fetch sessions by ID.
   * Done as a performance optimization workaround.
   */
  private sessionIdsAsFilters(sessionIds: string[]): KueryNode {
    return nodeBuilder.or(
      sessionIds.map((id) => {
        return nodeBuilder.is(`${SEARCH_SESSION_TYPE}.attributes.sessionId`, id);
      })
    );
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
    const filter = this.sessionIdsAsFilters(Array.from(this.sessionSearchMap.keys()));
    const res = await this.internalSavedObjectsClient.find<SearchSessionSavedObjectAttributes>({
      perPage: this.config.pageSize, // If there are more sessions in memory, they will be synced when some items are cleared out.
      type: SEARCH_SESSION_TYPE,
      filter,
      namespaces: ['*'],
    });
    this.logger.debug(`getAllMappedSavedObjects | Got ${res.saved_objects.length} items`);
    return res.saved_objects;
  }

  private clearSessions = async () => {
    const curTime = moment();

    this.sessionSearchMap.forEach((sessionInfo, sessionId) => {
      if (
        moment.duration(curTime.diff(sessionInfo.insertTime)).asMilliseconds() >
        this.config.inMemTimeout.asMilliseconds()
      ) {
        this.logger.debug(`clearSessions | Deleting expired session ${sessionId}`);
        this.sessionSearchMap.delete(sessionId);
      } else if (sessionInfo.retryCount >= this.config.maxUpdateRetries) {
        this.logger.warn(`clearSessions | Deleting failed session ${sessionId}`);
        this.sessionSearchMap.delete(sessionId);
      }
    });
  };

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
            this.logger.warn(
              `monitorMappedIds | update error ${JSON.stringify(updatedSavedObject.error) || ''}`
            );
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
    }, this.config.trackingInterval.asMilliseconds());
  }

  private async updateAllSavedObjects(
    activeMappingObjects: Array<SavedObject<SearchSessionSavedObjectAttributes>>
  ) {
    if (!activeMappingObjects.length) return [];

    this.logger.debug(`updateAllSavedObjects | Updating ${activeMappingObjects.length} items`);
    const updatedSessions: Array<
      SavedObjectsBulkUpdateObject<SearchSessionSavedObjectAttributes>
    > = activeMappingObjects
      .filter((so) => !so.error)
      .map((sessionSavedObject) => {
        const sessionInfo = this.sessionSearchMap.get(sessionSavedObject.id);
        const idMapping = sessionInfo ? Object.fromEntries(sessionInfo.ids.entries()) : {};
        sessionSavedObject.attributes.idMapping = {
          ...sessionSavedObject.attributes.idMapping,
          ...idMapping,
        };
        return {
          ...sessionSavedObject,
          namespace: sessionSavedObject.namespaces?.[0],
        };
      });

    const updateResults = await this.internalSavedObjectsClient.bulkUpdate<SearchSessionSavedObjectAttributes>(
      updatedSessions
    );
    return updateResults.saved_objects;
  }

  // TODO: Generate the `userId` from the realm type/realm name/username
  public save = async (
    { savedObjectsClient }: SearchSessionDependencies,
    sessionId: string,
    {
      name,
      appId,
      created = new Date().toISOString(),
      expires = new Date(Date.now() + this.config.defaultExpiration.asMilliseconds()).toISOString(),
      status = SearchSessionStatus.IN_PROGRESS,
      urlGeneratorId,
      initialState = {},
      restoreState = {},
    }: Partial<SearchSessionSavedObjectAttributes>
  ) => {
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
    const session = await savedObjectsClient.create<SearchSessionSavedObjectAttributes>(
      SEARCH_SESSION_TYPE,
      attributes,
      { id: sessionId }
    );

    return session;
  };

  // TODO: Throw an error if this session doesn't belong to this user
  public get = ({ savedObjectsClient }: SearchSessionDependencies, sessionId: string) => {
    this.logger.debug(`get | ${sessionId}`);
    return savedObjectsClient.get<SearchSessionSavedObjectAttributes>(
      SEARCH_SESSION_TYPE,
      sessionId
    );
  };

  // TODO: Throw an error if this session doesn't belong to this user
  public find = (
    { savedObjectsClient }: SearchSessionDependencies,
    options: Omit<SavedObjectsFindOptions, 'type'>
  ) => {
    return savedObjectsClient.find<SearchSessionSavedObjectAttributes>({
      ...options,
      type: SEARCH_SESSION_TYPE,
    });
  };

  // TODO: Throw an error if this session doesn't belong to this user
  public update = (
    { savedObjectsClient }: SearchSessionDependencies,
    sessionId: string,
    attributes: Partial<SearchSessionSavedObjectAttributes>
  ) => {
    this.logger.debug(`update | ${sessionId}`);
    return savedObjectsClient.update<SearchSessionSavedObjectAttributes>(
      SEARCH_SESSION_TYPE,
      sessionId,
      attributes
    );
  };

  public extend(deps: SearchSessionDependencies, sessionId: string, expires: Date) {
    this.logger.debug(`extend | ${sessionId}`);

    return this.update(deps, sessionId, { expires: expires.toISOString() });
  }

  // TODO: Throw an error if this session doesn't belong to this user
  public cancel = (deps: SearchSessionDependencies, sessionId: string) => {
    return this.update(deps, sessionId, {
      status: SearchSessionStatus.CANCELLED,
    });
  };

  /**
   * Tracks the given search request/search ID in the saved session (if it exists). Otherwise, just
   * store it in memory until a saved session exists.
   * @internal
   */
  public trackId = async (
    deps: SearchSessionDependencies,
    searchRequest: IKibanaSearchRequest,
    searchId: string,
    { sessionId, strategy }: ISearchOptions
  ) => {
    if (!sessionId || !searchId) return;
    this.logger.debug(`trackId | ${sessionId} | ${searchId}`);
    const requestHash = createRequestHash(searchRequest.params);
    const searchInfo = {
      id: searchId,
      strategy: strategy!,
      status: SearchStatus.IN_PROGRESS,
    };

    // Update the in-memory mapping for this session for when the session is saved.
    const map = this.sessionSearchMap.get(sessionId) ?? {
      insertTime: moment(),
      retryCount: 0,
      ids: new Map<string, SearchSessionRequestInfo>(),
    };
    map.ids.set(requestHash, searchInfo);
    this.sessionSearchMap.set(sessionId, map);
  };

  public async getSearchIdMapping(deps: SearchSessionDependencies, sessionId: string) {
    const searchSession = await this.get(deps, sessionId);
    const searchIdMapping = new Map<string, string>();
    Object.values(searchSession.attributes.idMapping).forEach((requestInfo) => {
      searchIdMapping.set(requestInfo.id, requestInfo.strategy);
    });
    return searchIdMapping;
  }

  /**
   * Look up an existing search ID that matches the given request in the given session so that the
   * request can continue rather than restart.
   * @internal
   */
  public getId = async (
    deps: SearchSessionDependencies,
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

    return session.attributes.idMapping[requestHash].id;
  };

  public asScopedProvider = ({ savedObjects }: CoreStart) => {
    return (request: KibanaRequest) => {
      const savedObjectsClient = savedObjects.getScopedClient(request, {
        includedHiddenTypes: [SEARCH_SESSION_TYPE],
      });
      const deps = { savedObjectsClient };
      return {
        getId: this.getId.bind(this, deps),
        trackId: this.trackId.bind(this, deps),
        getSearchIdMapping: this.getSearchIdMapping.bind(this, deps),
        save: this.save.bind(this, deps),
        get: this.get.bind(this, deps),
        find: this.find.bind(this, deps),
        update: this.update.bind(this, deps),
        extend: this.extend.bind(this, deps),
        cancel: this.cancel.bind(this, deps),
      };
    };
  };
}
