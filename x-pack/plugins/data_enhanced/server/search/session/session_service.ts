/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, KibanaRequest, SavedObject, SavedObjectsClientContract } from 'kibana/server';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import Boom from '@hapi/boom';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
  tapFirst,
} from '../../../../../../src/plugins/data/common';
import {
  ISearchStrategy,
  ISessionService,
  SearchStrategyDependencies,
} from '../../../../../../src/plugins/data/server';
import { AuthenticatedUser } from '../../../../security/common/model';
import { SecurityPluginSetup } from '../../../../security/server';
import {
  BackgroundSessionSavedObjectAttributes,
  BackgroundSessionFindOptions,
  BackgroundSessionStatus,
} from '../../../common';
import { BACKGROUND_SESSION_TYPE } from '../../saved_objects';
import { createRequestHash } from './utils';

const DEFAULT_EXPIRATION = 7 * 24 * 60 * 60 * 1000;

export interface BackgroundSessionDependencies {
  savedObjectsClient: SavedObjectsClientContract;
}

export class BackgroundSessionService implements ISessionService {
  /**
   * Map of sessionId to { [requestHash]: searchId }
   * @private
   */
  private sessionSearchMap = new Map<string, Map<string, string>>();

  constructor(private security?: SecurityPluginSetup) {}

  public search<Request extends IKibanaSearchRequest, Response extends IKibanaSearchResponse>(
    user: AuthenticatedUser | null,
    strategy: ISearchStrategy<Request, Response>,
    searchRequest: Request,
    options: ISearchOptions,
    searchDeps: SearchStrategyDependencies,
    deps: BackgroundSessionDependencies
  ): Observable<Response> {
    // If this is a restored background search session, look up the ID using the provided sessionId
    const getSearchRequest = async () =>
      !options.isRestore || searchRequest.id
        ? searchRequest
        : {
            ...searchRequest,
            id: await this.getId(user, searchRequest, options, deps),
          };

    return from(getSearchRequest()).pipe(
      switchMap((request) => strategy.search(request, options, searchDeps)),
      tapFirst((response) => {
        if (searchRequest.id || !options.sessionId || !response.id || options.isRestore) return;
        this.trackId(user, searchRequest, response.id, options, deps);
      })
    );
  }

  public save = async (
    user: AuthenticatedUser | null,
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
    }: Partial<BackgroundSessionSavedObjectAttributes>,
    { savedObjectsClient }: BackgroundSessionDependencies
  ) => {
    if (!name) throw new Error('Name is required');
    if (!appId) throw new Error('AppId is required');
    if (!urlGeneratorId) throw new Error('UrlGeneratorId is required');

    const realmType = user?.authentication_realm.type ?? null;
    const realmName = user?.authentication_realm.name ?? null;
    const username = user?.username ?? null;

    // Get the mapping of request hash/search ID for this session
    const searchMap = this.sessionSearchMap.get(sessionId) ?? new Map<string, string>();
    const idMapping = Object.fromEntries(searchMap.entries());
    const attributes = {
      realmType,
      realmName,
      username,
      name,
      created,
      expires,
      status,
      initialState,
      restoreState,
      idMapping,
      urlGeneratorId,
      appId,
    };
    const session = await savedObjectsClient.create<BackgroundSessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      attributes,
      { id: sessionId }
    );

    // Clear out the entries for this session ID so they don't get saved next time
    this.sessionSearchMap.delete(sessionId);

    return session;
  };

  public get = async (
    user: AuthenticatedUser | null,
    sessionId: string,
    { savedObjectsClient }: BackgroundSessionDependencies
  ) => {
    const session = await savedObjectsClient.get<BackgroundSessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      sessionId
    );
    this.throwOnUserConflict(user, session);
    return session;
  };

  public find = async (
    user: AuthenticatedUser | null,
    options: BackgroundSessionFindOptions,
    { savedObjectsClient }: BackgroundSessionDependencies
  ) => {
    const userFilters =
      user === null
        ? []
        : [
            `${BACKGROUND_SESSION_TYPE}.attributes.realmType: ${user.authentication_realm.type}`,
            `${BACKGROUND_SESSION_TYPE}.attributes.realmName: ${user.authentication_realm.name}`,
            `${BACKGROUND_SESSION_TYPE}.attributes.username: ${user.username}`,
          ];
    const filter = userFilters.concat(options.filter ?? []).join(' and ');
    return savedObjectsClient.find<BackgroundSessionSavedObjectAttributes>({
      ...options,
      filter,
      type: BACKGROUND_SESSION_TYPE,
    });
  };

  public update = async (
    user: AuthenticatedUser | null,
    sessionId: string,
    attributes: Partial<BackgroundSessionSavedObjectAttributes>,
    deps: BackgroundSessionDependencies
  ) => {
    const session = await this.get(user, sessionId, deps);
    this.throwOnUserConflict(user, session);
    return deps.savedObjectsClient.update<BackgroundSessionSavedObjectAttributes>(
      BACKGROUND_SESSION_TYPE,
      sessionId,
      attributes
    );
  };

  public delete = async (
    user: AuthenticatedUser | null,
    sessionId: string,
    deps: BackgroundSessionDependencies
  ) => {
    const session = await this.get(user, sessionId, deps);
    this.throwOnUserConflict(user, session);
    return deps.savedObjectsClient.delete(BACKGROUND_SESSION_TYPE, sessionId);
  };

  /**
   * Tracks the given search request/search ID in the saved session (if it exists). Otherwise, just
   * store it in memory until a saved session exists.
   * @internal
   */
  public trackId = async (
    user: AuthenticatedUser | null,
    searchRequest: IKibanaSearchRequest,
    searchId: string,
    { sessionId, isStored }: ISearchOptions,
    deps: BackgroundSessionDependencies
  ) => {
    if (!sessionId || !searchId) return;
    const requestHash = createRequestHash(searchRequest.params);

    // If there is already a saved object for this session, update it to include this request/ID.
    // Otherwise, just update the in-memory mapping for this session for when the session is saved.
    if (isStored) {
      const attributes = { idMapping: { [requestHash]: searchId } };
      await this.update(user, sessionId, attributes, deps);
    } else {
      const map = this.sessionSearchMap.get(sessionId) ?? new Map<string, string>();
      map.set(requestHash, searchId);
      this.sessionSearchMap.set(sessionId, map);
    }
  };

  /**
   * Look up an existing search ID that matches the given request in the given session so that the
   * request can continue rather than restart.
   * @internal
   */
  public getId = async (
    user: AuthenticatedUser | null,
    searchRequest: IKibanaSearchRequest,
    { sessionId, isStored, isRestore }: ISearchOptions,
    deps: BackgroundSessionDependencies
  ) => {
    if (!sessionId) {
      throw new Error('Session ID is required');
    } else if (!isStored) {
      throw new Error('Cannot get search ID from a session that is not stored');
    } else if (!isRestore) {
      throw new Error('Get search ID is only supported when restoring a session');
    }

    const session = await this.get(user, sessionId, deps);
    const requestHash = createRequestHash(searchRequest.params);
    if (!session.attributes.idMapping.hasOwnProperty(requestHash)) {
      throw new Error('No search ID in this session matching the given search request');
    }

    return session.attributes.idMapping[requestHash];
  };

  public asScopedProvider = ({ savedObjects }: CoreStart) => {
    return (request: KibanaRequest) => {
      const user = this.security?.authc.getCurrentUser(request) ?? null;
      const savedObjectsClient = savedObjects.getScopedClient(request, {
        includedHiddenTypes: [BACKGROUND_SESSION_TYPE],
      });
      const deps = { savedObjectsClient };
      return {
        search: <Request extends IKibanaSearchRequest, Response extends IKibanaSearchResponse>(
          strategy: ISearchStrategy<Request, Response>,
          ...args: Parameters<ISearchStrategy<Request, Response>['search']>
        ) => this.search(user, strategy, ...args, deps),
        save: (sessionId: string, attributes: Partial<BackgroundSessionSavedObjectAttributes>) =>
          this.save(user, sessionId, attributes, deps),
        get: (sessionId: string) => this.get(user, sessionId, deps),
        find: (options: BackgroundSessionFindOptions) => this.find(user, options, deps),
        update: (sessionId: string, attributes: Partial<BackgroundSessionSavedObjectAttributes>) =>
          this.update(user, sessionId, attributes, deps),
        delete: (sessionId: string) => this.delete(user, sessionId, deps),
      };
    };
  };

  private throwOnUserConflict = (
    user: AuthenticatedUser | null,
    session: SavedObject<BackgroundSessionSavedObjectAttributes>
  ) => {
    if (user === null) return;
    if (
      user.authentication_realm.type !== session.attributes.realmType ||
      user.authentication_realm.name !== session.attributes.realmName ||
      user.username !== session.attributes.username
    ) {
      throw Boom.notFound();
    }
  };
}
