/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { from, Observable } from 'rxjs';
import { first, switchMap, tap } from 'rxjs/operators';
import {
  CoreStart,
  KibanaRequest,
  SavedObjectsClientContract,
  Logger,
  CoreSetup,
  SavedObjectsFindOptions,
  SavedObjectsErrorHelpers,
  SavedObjectsUpdateResponse,
  SavedObject,
} from '../../../../../../src/core/server';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '../../../../../../src/plugins/data/common';
import {
  ISearchStrategy,
  ISessionService,
  SearchStrategyDependencies,
} from '../../../../../../src/plugins/data/server';
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
export class SearchSessionService implements ISessionService {
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

  public stop() {}

  private setupMonitoring = async (core: CoreStart, deps: StartDependencies) => {
    if (this.config.enabled) {
      scheduleSearchSessionsTasks(deps.taskManager, this.logger, this.config.trackingInterval);
    }
  };

  public search<Request extends IKibanaSearchRequest, Response extends IKibanaSearchResponse>(
    strategy: ISearchStrategy<Request, Response>,
    searchRequest: Request,
    options: ISearchOptions,
    searchDeps: SearchStrategyDependencies,
    deps: SearchSessionDependencies
  ): Observable<Response> {
    // If this is a restored background search session, look up the ID using the provided sessionId
    const getSearchRequest = async () =>
      !options.isRestore || searchRequest.id
        ? searchRequest
        : {
            ...searchRequest,
            id: await this.getId(searchRequest, options, deps),
          };

    return from(getSearchRequest()).pipe(
      switchMap((request) => strategy.search(request, options, searchDeps)),
      tap((response) => {
        if (!options.sessionId || !response.id || options.isRestore) return;
        this.trackId(searchRequest, response.id, options, deps);
      })
    );
  }

  private updateOrCreate = async (
    sessionId: string,
    attributes: Partial<SearchSessionSavedObjectAttributes>,
    deps: SearchSessionDependencies,
    retry: number = 1
  ): Promise<
    | SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>
    | SavedObject<SearchSessionSavedObjectAttributes>
    | undefined
  > => {
    const retryOnConflict = async (e: any) => {
      this.logger.debug(`Conflict error | ${sessionId}`);
      // Randomize sleep to spread updates out in case of conflicts
      await sleep(100 + Math.random() * 50);
      return await this.updateOrCreate(sessionId, attributes, deps, retry + 1);
    };

    this.logger.debug(`updateOrCreate | ${sessionId} | ${retry}`);
    try {
      return await this.update(sessionId, attributes, deps);
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        try {
          this.logger.debug(`Object not found | ${sessionId}`);
          return await this.create(sessionId, attributes, deps);
        } catch (createError) {
          if (
            SavedObjectsErrorHelpers.isConflictError(createError) &&
            retry < this.config.maxUpdateRetries
          ) {
            return await retryOnConflict(createError);
          } else {
            this.logger.error(createError);
          }
        }
      } else if (
        SavedObjectsErrorHelpers.isConflictError(e) &&
        retry < this.config.maxUpdateRetries
      ) {
        return await retryOnConflict(e);
      } else {
        this.logger.error(e);
      }
    }

    return undefined;
  };

  public save = async (
    sessionId: string,
    {
      name,
      appId,
      urlGeneratorId,
      initialState = {},
      restoreState = {},
    }: Partial<SearchSessionSavedObjectAttributes>,
    deps: SearchSessionDependencies
  ) => {
    if (!name) throw new Error('Name is required');
    if (!appId) throw new Error('AppId is required');
    if (!urlGeneratorId) throw new Error('UrlGeneratorId is required');

    return this.updateOrCreate(
      sessionId,
      {
        name,
        appId,
        urlGeneratorId,
        initialState,
        restoreState,
        persisted: true,
      },
      deps
    );
  };

  private create = (
    sessionId: string,
    attributes: Partial<SearchSessionSavedObjectAttributes>,
    { savedObjectsClient }: SearchSessionDependencies
  ) => {
    this.logger.debug(`create | ${sessionId}`);
    return savedObjectsClient.create<SearchSessionSavedObjectAttributes>(
      SEARCH_SESSION_TYPE,
      {
        sessionId,
        status: SearchSessionStatus.IN_PROGRESS,
        expires: new Date(
          Date.now() + this.config.defaultExpiration.asMilliseconds()
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
  public get = (sessionId: string, { savedObjectsClient }: SearchSessionDependencies) => {
    this.logger.debug(`get | ${sessionId}`);
    return savedObjectsClient.get<SearchSessionSavedObjectAttributes>(
      SEARCH_SESSION_TYPE,
      sessionId
    );
  };

  // TODO: Throw an error if this session doesn't belong to this user
  public find = (
    options: Omit<SavedObjectsFindOptions, 'type'>,
    { savedObjectsClient }: SearchSessionDependencies
  ) => {
    return savedObjectsClient.find<SearchSessionSavedObjectAttributes>({
      ...options,
      type: SEARCH_SESSION_TYPE,
    });
  };

  // TODO: Throw an error if this session doesn't belong to this user
  public update = (
    sessionId: string,
    attributes: Partial<SearchSessionSavedObjectAttributes>,
    { savedObjectsClient }: SearchSessionDependencies
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

  // TODO: Throw an error if this session doesn't belong to this user
  public delete = (sessionId: string, { savedObjectsClient }: SearchSessionDependencies) => {
    return savedObjectsClient.delete(SEARCH_SESSION_TYPE, sessionId);
  };

  /**
   * Tracks the given search request/search ID in the saved session.
   * @internal
   */
  public trackId = async (
    searchRequest: IKibanaSearchRequest,
    searchId: string,
    { sessionId, strategy }: ISearchOptions,
    deps: SearchSessionDependencies
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

    return this.updateOrCreate(sessionId, { idMapping }, deps);
  };

  /**
   * Look up an existing search ID that matches the given request in the given session so that the
   * request can continue rather than restart.
   * @internal
   */
  public getId = async (
    searchRequest: IKibanaSearchRequest,
    { sessionId, isStored, isRestore }: ISearchOptions,
    deps: SearchSessionDependencies
  ) => {
    if (!sessionId) {
      throw new Error('Session ID is required');
    } else if (!isStored) {
      throw new Error('Cannot get search ID from a session that is not stored');
    } else if (!isRestore) {
      throw new Error('Get search ID is only supported when restoring a session');
    }

    const session = await this.get(sessionId, deps);
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
        search: <Request extends IKibanaSearchRequest, Response extends IKibanaSearchResponse>(
          strategy: ISearchStrategy<Request, Response>,
          ...args: Parameters<ISearchStrategy<Request, Response>['search']>
        ) => this.search(strategy, ...args, deps),
        save: (sessionId: string, attributes: Partial<SearchSessionSavedObjectAttributes>) =>
          this.save(sessionId, attributes, deps),
        get: (sessionId: string) => this.get(sessionId, deps),
        find: (options: SavedObjectsFindOptions) => this.find(options, deps),
        update: (sessionId: string, attributes: Partial<SearchSessionSavedObjectAttributes>) =>
          this.update(sessionId, attributes, deps),
        delete: (sessionId: string) => this.delete(sessionId, deps),
      };
    };
  };
}
