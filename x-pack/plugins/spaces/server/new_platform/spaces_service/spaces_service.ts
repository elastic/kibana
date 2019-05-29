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
import { SpacesConfigType } from '../config';

type RequestFacade = KibanaRequest | Legacy.Request;

export interface SpacesServiceSetup {
  scopedClient(request: RequestFacade): SpacesClient;

  getSpaceId(request: RequestFacade): string;

  isInDefaultSpace(request: RequestFacade): boolean;
}

interface SpacesServiceDeps {
  http: HttpServiceSetup;
  elasticsearch: ElasticsearchServiceSetup;
  savedObjects: SavedObjectsService;
  getSecurity: () => SecurityPlugin | undefined;
  config$: Observable<SpacesConfigType>;
  spacesAuditLogger: any;
}

export class SpacesService {
  private configSubscription$?: Subscription;

  constructor(private readonly log: Logger, private readonly serverBasePath: string) {}

  public async setup({
    http,
    elasticsearch,
    savedObjects,
    getSecurity,
    config$,
    spacesAuditLogger,
  }: SpacesServiceDeps): Promise<SpacesServiceSetup> {
    let config: SpacesConfigType = await config$.pipe(first()).toPromise();

    this.configSubscription$ = config$.subscribe({
      next: updatedConfig => {
        config = updatedConfig;
      },
    });

    const adminClient = await elasticsearch.adminClient$.pipe(first()).toPromise();

    const getSpaceId = (request: RequestFacade) => {
      const isLegacyRequest = typeof (request as any).getBasePath === 'function';

      const basePath = isLegacyRequest
        ? (request as Record<string, any>).getBasePath()
        : http.getBasePathFor(request);

      const spaceId = getSpaceIdFromPath(basePath, this.serverBasePath);

      return spaceId;
    };

    return {
      getSpaceId,
      isInDefaultSpace: (request: RequestFacade) => {
        const spaceId = getSpaceId(request);

        return spaceId === DEFAULT_SPACE_ID;
      },
      scopedClient: (request: RequestFacade) => {
        const internalRepository = savedObjects.getSavedObjectsRepository(
          adminClient.callAsInternalUser
        );

        const callCluster = adminClient.asScoped(request).callAsCurrentUser;

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
}
