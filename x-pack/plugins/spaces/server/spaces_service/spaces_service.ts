/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, take } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';
import { Legacy } from 'kibana';
import { Logger, KibanaRequest, CoreSetup } from '../../../../../src/core/server';
import { SecurityPluginSetup } from '../../../security/server';
import { SpacesClient } from '../lib/spaces_client';
import { ConfigType } from '../config';
import { getSpaceIdFromPath, addSpaceIdToPath } from '../../common/lib/spaces_url_parser';
import { DEFAULT_SPACE_ID } from '../../common/constants';
import { spaceIdToNamespace, namespaceToSpaceId } from '../lib/utils/namespace';
import { Space } from '../../common/model/space';
import { SpacesAuditLogger } from '../lib/audit_logger';

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
  getStartServices: CoreSetup['getStartServices'];
  authorization: SecurityPluginSetup['authz'] | null;
  config$: Observable<ConfigType>;
  auditLogger: SpacesAuditLogger;
}

export class SpacesService {
  private configSubscription$?: Subscription;

  constructor(private readonly log: Logger) {}

  public async setup({
    http,
    getStartServices,
    authorization,
    config$,
    auditLogger,
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

    const internalRepositoryPromise = getStartServices().then(([coreStart]) =>
      coreStart.savedObjects.createInternalRepository(['space'])
    );

    const getScopedClient = async (request: KibanaRequest) => {
      const [coreStart] = await getStartServices();
      const internalRepository = await internalRepositoryPromise;

      return config$
        .pipe(
          take(1),
          map((config) => {
            const callWithRequestRepository = coreStart.savedObjects.createScopedRepository(
              request,
              ['space']
            );

            return new SpacesClient(
              auditLogger,
              (message: string) => {
                this.log.debug(message);
              },
              authorization,
              callWithRequestRepository,
              config,
              internalRepository,
              request
            );
          })
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
