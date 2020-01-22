/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, take } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';
import { Legacy } from 'kibana';
import { Logger, KibanaRequest, CoreSetup } from '../../../../../src/core/server';
import { PluginSetupContract as SecurityPluginSetup } from '../../../security/server';
import { LegacyAPI } from '../plugin';
import { SpacesClient } from '../lib/spaces_client';
import { ConfigType } from '../config';
import { getSpaceIdFromPath, addSpaceIdToPath } from '../../common/lib/spaces_url_parser';
import { DEFAULT_SPACE_ID } from '../../common/constants';
import { spaceIdToNamespace, namespaceToSpaceId } from '../lib/utils/namespace';
import { Space } from '../../common/model/space';

type RequestFacade = KibanaRequest | Legacy.Request;

export interface SpacesServiceSetup {
  scopedClient(request: RequestFacade): Promise<SpacesClient>;

  getSpaceId(request: RequestFacade): string;

  getBasePath(spaceId: string): string;

  isInDefaultSpace(request: RequestFacade): boolean;

  spaceIdToNamespace(spaceId: string): string | undefined;

  namespaceToSpaceId(namespace: string | undefined): string;

  getActiveSpace(request: RequestFacade): Promise<Space>;
}

interface SpacesServiceDeps {
  http: CoreSetup['http'];
  elasticsearch: CoreSetup['elasticsearch'];
  authorization: SecurityPluginSetup['authz'] | null;
  config$: Observable<ConfigType>;
  getSpacesAuditLogger(): any;
}

export class SpacesService {
  private configSubscription$?: Subscription;

  constructor(private readonly log: Logger, private readonly getLegacyAPI: () => LegacyAPI) {}

  public async setup({
    http,
    elasticsearch,
    authorization,
    config$,
    getSpacesAuditLogger,
  }: SpacesServiceDeps): Promise<SpacesServiceSetup> {
    const getSpaceId = (request: RequestFacade) => {
      // Currently utilized by reporting
      const isFakeRequest = typeof (request as any).getBasePath === 'function';

      const basePath = isFakeRequest
        ? (request as Record<string, any>).getBasePath()
        : http.basePath.get(request);

      const spaceId = getSpaceIdFromPath(basePath, http.basePath.serverBasePath);

      return spaceId;
    };

    const getScopedClient = async (request: KibanaRequest) => {
      return config$
        .pipe(
          map(config => {
            const internalRepository = this.getLegacyAPI().savedObjects.getSavedObjectsRepository(
              elasticsearch.adminClient.callAsInternalUser,
              ['space']
            );

            const callCluster = elasticsearch.adminClient.asScoped(request).callAsCurrentUser;

            const callWithRequestRepository = this.getLegacyAPI().savedObjects.getSavedObjectsRepository(
              callCluster,
              ['space']
            );

            return new SpacesClient(
              getSpacesAuditLogger(),
              (message: string) => {
                this.log.debug(message);
              },
              authorization,
              callWithRequestRepository,
              config,
              internalRepository,
              request
            );
          }),
          take(1)
        )
        .toPromise();
    };

    return {
      getSpaceId,
      getBasePath: (spaceId: string) => {
        if (!spaceId) {
          throw new TypeError(`spaceId is required to retrieve base path`);
        }
        return addSpaceIdToPath(http.basePath.serverBasePath, spaceId);
      },
      isInDefaultSpace: (request: RequestFacade) => {
        const spaceId = getSpaceId(request);

        return spaceId === DEFAULT_SPACE_ID;
      },
      spaceIdToNamespace,
      namespaceToSpaceId,
      scopedClient: getScopedClient,
      getActiveSpace: async (request: RequestFacade) => {
        const spaceId = getSpaceId(request);
        const spacesClient = await getScopedClient(
          request instanceof KibanaRequest ? request : KibanaRequest.from(request)
        );
        return spacesClient.get(spaceId);
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
