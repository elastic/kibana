/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Request } from 'hapi';
import { Logger } from 'src/core/server';
import { SavedObjectsService } from 'src/legacy/server/kbn_server';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { SecurityPlugin } from '../../../../security';
import { SpacesConfig } from '../../..';
import { SpacesClient } from '../../lib/spaces_client';
import { getSpaceIdFromPath } from '../../lib/spaces_url_parser';

export interface SpacesServiceSetup {
  scopedClient(request: Record<string, any>): SpacesClient;

  getSpaceId(request: Record<string, any>): string;

  isInDefaultSpace(request: Record<string, any>): boolean;
}

interface CacheEntry {
  spaceId: string;
  isInDefaultSpace: boolean;
}

interface SpacesServiceDeps {
  elasticsearch: ElasticsearchPlugin;
  savedObjects: SavedObjectsService;
  security: SecurityPlugin;
  spacesAuditLogger: any;
}

export class SpacesService {
  private readonly serverBasePath: string;

  private readonly contextCache: WeakMap<any, CacheEntry>;

  constructor(private readonly log: Logger, private readonly config: SpacesConfig) {
    this.serverBasePath = config.get('server.basePath');

    this.contextCache = new WeakMap();
  }

  public async setup({
    elasticsearch,
    savedObjects,
    security,
    spacesAuditLogger,
  }: SpacesServiceDeps): Promise<SpacesServiceSetup> {
    const adminClient = elasticsearch.getCluster('admin');
    return {
      getSpaceId: (request: Record<string, any>) => {
        if (!this.contextCache.has(request)) {
          this.populateCache(request);
        }

        const { spaceId } = this.contextCache.get(request) as CacheEntry;
        return spaceId;
      },
      isInDefaultSpace: (request: any) => {
        if (!this.contextCache.has(request)) {
          this.populateCache(request);
        }

        return this.contextCache.get(request)!.isInDefaultSpace;
      },
      scopedClient: (request: Request) => {
        const { callWithRequest, callWithInternalUser } = adminClient;

        const internalRepository = savedObjects.getSavedObjectsRepository(callWithInternalUser);
        const callWithRequestRepository = savedObjects.getSavedObjectsRepository(
          (endpoint: string, params: any, options?: any) =>
            callWithRequest(request, endpoint, params, options)
        );
        const authorization = security ? security.authorization : null;

        return new SpacesClient(
          spacesAuditLogger,
          (message: string) => {
            this.log.debug(message);
          },
          authorization,
          callWithRequestRepository,
          this.config,
          internalRepository,
          request
        );
      },
    };
  }

  private populateCache(request: Record<string, any>) {
    const spaceId = getSpaceIdFromPath(request.getBasePath(), this.serverBasePath);

    this.contextCache.set(request, {
      spaceId,
      isInDefaultSpace: spaceId === DEFAULT_SPACE_ID,
    });
  }
}
