/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';
import { Legacy } from 'kibana';
import { SavedObjectsService } from 'src/legacy/server/kbn_server';
import {
  Logger,
  ElasticsearchServiceSetup,
  HttpServiceSetup,
  KibanaRequest,
} from 'src/core/server';
import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { SecurityPlugin } from '../../../../security';
import { SpacesClient } from '../../lib/spaces_client';
import { getSpaceIdFromPath } from '../../lib/spaces_url_parser';
import { SpacesConfig } from '../config';

type RequestFacade = KibanaRequest | Legacy.Request;

export interface SpacesServiceSetup {
  scopedClient(request: RequestFacade): SpacesClient;

  getSpaceId(request: RequestFacade): string;

  isInDefaultSpace(request: RequestFacade): boolean;
}

interface CacheEntry {
  spaceId: string;
  isInDefaultSpace: boolean;
}

interface SpacesServiceDeps {
  http: HttpServiceSetup;
  elasticsearch: ElasticsearchServiceSetup;
  savedObjects: SavedObjectsService;
  getSecurity: () => SecurityPlugin | undefined;
  config$: Observable<SpacesConfig>;
  spacesAuditLogger: any;
}

export class SpacesService {
  private configSubscription$?: Subscription;

  private readonly contextCache: WeakMap<any, CacheEntry> = new WeakMap();

  constructor(private readonly log: Logger, private readonly serverBasePath: string) {
    this.contextCache = new WeakMap();
  }

  public async setup({
    http,
    elasticsearch,
    savedObjects,
    getSecurity,
    config$,
    spacesAuditLogger,
  }: SpacesServiceDeps): Promise<SpacesServiceSetup> {
    let config: SpacesConfig = await config$.pipe(first()).toPromise();

    this.configSubscription$ = config$.subscribe({
      next: updatedConfig => {
        config = updatedConfig;
      },
    });

    const adminClient = await elasticsearch.adminClient$.pipe(first()).toPromise();
    return {
      getSpaceId: (request: RequestFacade) => {
        if (!this.contextCache.has(request)) {
          this.populateCache(http, request);
        }

        const { spaceId } = this.contextCache.get(request) as CacheEntry;
        return spaceId;
      },
      isInDefaultSpace: (request: RequestFacade) => {
        if (!this.contextCache.has(request)) {
          this.populateCache(http, request);
        }

        return this.contextCache.get(request)!.isInDefaultSpace;
      },
      scopedClient: (request: RequestFacade) => {
        const internalRepository = savedObjects.getSavedObjectsRepository(
          adminClient.callAsInternalUser
        );

        const callCluster = (endpoint: string, ...args: any[]) =>
          adminClient.asScoped(request).callAsCurrentUser(endpoint, ...args);

        const callWithRequestRepository = savedObjects.getSavedObjectsRepository(callCluster);

        const security = getSecurity();
        const authorization = security ? security.authorization : null;

        return new SpacesClient(
          spacesAuditLogger,
          (message: string) => {
            this.log.debug(message);
          },
          authorization,
          callWithRequestRepository,
          config,
          internalRepository,
          request
        );
      },
    };
  }

  public async stop() {
    if (this.configSubscription$) {
      this.configSubscription$.unsubscribe();
      this.configSubscription$ = undefined;
    }
  }

  private populateCache(http: HttpServiceSetup, request: RequestFacade) {
    const isLegacyRequest = typeof (request as any).getBasePath === 'function';

    const basePath = isLegacyRequest
      ? (request as Record<string, any>).getBasePath()
      : http.getBasePathFor(request);

    const spaceId = getSpaceIdFromPath(basePath, this.serverBasePath);

    this.contextCache.set(request, {
      spaceId,
      isInDefaultSpace: spaceId === DEFAULT_SPACE_ID,
    });
  }
}
