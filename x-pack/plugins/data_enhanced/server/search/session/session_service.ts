/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  SavedObjectsClientContract,
  Logger,
  SavedObject,
  SavedObjectsFindOptions,
  SavedObjectsErrorHelpers,
} from '../../../../../../src/core/server';
import { IKibanaSearchRequest, ISearchOptions } from '../../../../../../src/plugins/data/common';
import { ISearchSessionService } from '../../../../../../src/plugins/data/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../task_manager/server';
import {
  SearchSessionRequestInfo,
  SearchSessionSavedObjectAttributes,
  SearchSessionStatus,
  SEARCH_SESSION_TYPE,
} from '../../../common';
import { createRequestHash } from './utils';
import { ConfigSchema } from '../../../config';
import { registerSearchSessionsTask, scheduleSearchSessionsTasks } from './monitoring_task';
import { SearchSessionsConfig, SearchStatus } from './types';

export interface SearchSessionDependencies {
  savedObjectsClient: SavedObjectsClientContract;
}
interface SetupDependencies {
  taskManager: TaskManagerSetupContract;
}

interface StartDependencies {
  taskManager: TaskManagerStartContract;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
export class SearchSessionService
  implements ISearchSessionService<SearchSessionSavedObjectAttributes> {
  private sessionConfig!: SearchSessionsConfig;

  constructor(private readonly logger: Logger, private readonly config: ConfigSchema) {
    this.sessionConfig = this.config.search.sessions;
  }

  public setup(core: CoreSetup, deps: SetupDependencies) {
    registerSearchSessionsTask(core, {
      config: this.config,
      taskManager: deps.taskManager,
      logger: this.logger,
    });
  }

  public async start(core: CoreStart, deps: StartDependencies) {
    return this.setupMonitoring(core, deps);
  }

  public stop() {}

  private setupMonitoring = async (core: CoreStart, deps: StartDependencies) => {
    if (this.sessionConfig.enabled) {
      scheduleSearchSessionsTasks(
        deps.taskManager,
        this.logger,
        this.sessionConfig.trackingInterval
      );
    }
  };

  private updateOrCreate = async (
    deps: SearchSessionDependencies,
    sessionId: string,
    attributes: Partial<SearchSessionSavedObjectAttributes>,
    retry: number = 1
  ): Promise<SavedObject<SearchSessionSavedObjectAttributes> | undefined> => {
    const retryOnConflict = async (e: any) => {
      this.logger.debug(`Conflict error | ${sessionId}`);
      // Randomize sleep to spread updates out in case of conflicts
      await sleep(100 + Math.random() * 50);
      return await this.updateOrCreate(deps, sessionId, attributes, retry + 1);
    };

    this.logger.debug(`updateOrCreate | ${sessionId} | ${retry}`);
    try {
      return (await this.update(
        deps,
        sessionId,
        attributes
      )) as SavedObject<SearchSessionSavedObjectAttributes>;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        try {
          this.logger.debug(`Object not found | ${sessionId}`);
          return await this.create(deps, sessionId, attributes);
        } catch (createError) {
          if (
            SavedObjectsErrorHelpers.isConflictError(createError) &&
            retry < this.sessionConfig.maxUpdateRetries
          ) {
            return await retryOnConflict(createError);
          } else {
            this.logger.error(createError);
          }
        }
      } else if (
        SavedObjectsErrorHelpers.isConflictError(e) &&
        retry < this.sessionConfig.maxUpdateRetries
      ) {
        return await retryOnConflict(e);
      } else {
        this.logger.error(e);
      }
    }

    return undefined;
  };

  public save = async (
    deps: SearchSessionDependencies,
    sessionId: string,
    {
      name,
      appId,
      urlGeneratorId,
      initialState = {},
      restoreState = {},
    }: Partial<SearchSessionSavedObjectAttributes>
  ) => {
    if (!name) throw new Error('Name is required');
    if (!appId) throw new Error('AppId is required');
    if (!urlGeneratorId) throw new Error('UrlGeneratorId is required');

    return this.updateOrCreate(deps, sessionId, {
      name,
      appId,
      urlGeneratorId,
      initialState,
      restoreState,
      persisted: true,
    });
  };

  private create = (
    { savedObjectsClient }: SearchSessionDependencies,
    sessionId: string,
    attributes: Partial<SearchSessionSavedObjectAttributes>
  ) => {
    this.logger.debug(`create | ${sessionId}`);
    return savedObjectsClient.create<SearchSessionSavedObjectAttributes>(
      SEARCH_SESSION_TYPE,
      {
        sessionId,
        status: SearchSessionStatus.IN_PROGRESS,
        expires: new Date(
          Date.now() + this.sessionConfig.defaultExpiration.asMilliseconds()
        ).toISOString(),
        created: new Date().toISOString(),
        touched: new Date().toISOString(),
        idMapping: {},
        persisted: false,
        ...attributes,
      },
      { id: sessionId }
    );
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
      {
        ...attributes,
        touched: new Date().toISOString(),
      }
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
   * Tracks the given search request/search ID in the saved session.
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

    let idMapping: Record<string, SearchSessionRequestInfo> = {};

    if (searchRequest.params) {
      const requestHash = createRequestHash(searchRequest.params);
      const searchInfo = {
        id: searchId,
        strategy: strategy!,
        status: SearchStatus.IN_PROGRESS,
      };
      idMapping = { [requestHash]: searchInfo };
    }

    await this.updateOrCreate(deps, sessionId, { idMapping });
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
      this.logger.error(`getId | ${sessionId} | ${requestHash} not found`);
      throw new Error('No search ID in this session matching the given search request');
    }
    this.logger.debug(`getId | ${sessionId} | ${requestHash}`);

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
