/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subscription } from 'rxjs';
import { Legacy } from 'kibana';
import { Logger, KibanaRequest, CoreSetup, CoreStart } from '../../../../../src/core/server';
import {
  ISpacesClient,
  SpacesClientService,
  SpacesClientServiceSetup,
  SpacesClientServiceStart,
} from '../lib/spaces_client';
import { ConfigType } from '../config';
import { getSpaceIdFromPath, addSpaceIdToPath } from '../../common/lib/spaces_url_parser';
import { DEFAULT_SPACE_ID } from '../../common/constants';
import { spaceIdToNamespace, namespaceToSpaceId } from '../lib/utils/namespace';
import { Space } from '..';

type RequestFacade = KibanaRequest | Legacy.Request;

export interface SpacesServiceSetup {
  scopedClient(request: RequestFacade): ISpacesClient;

  getSpaceId(request: RequestFacade): string;

  isInDefaultSpace(request: RequestFacade): boolean;

  getActiveSpace(request: RequestFacade): Promise<Space>;

  getBasePath(spaceId: string): string;

  spaceIdToNamespace(spaceId: string): string | undefined;

  namespaceToSpaceId(namespace: string | undefined): string;

  clientService: SpacesClientServiceSetup;
}

export type SpacesServiceStart = SpacesClientServiceStart;

interface SpacesServiceDeps {
  http: CoreSetup['http'];
  config$: Observable<ConfigType>;
}

export class SpacesService {
  private configSubscription$?: Subscription;

  private spacesClientService?: SpacesClientService;

  private spacesClientServiceStart?: ReturnType<SpacesClientService['start']>;

  constructor(private readonly log: Logger) {}

  public setup({ http, config$ }: SpacesServiceDeps): SpacesServiceSetup {
    this.spacesClientService = new SpacesClientService(
      (message: string) => this.log.debug(message),
      config$
    );

    const getSpaceId = (request: RequestFacade) => {
      // Currently utilized by reporting
      const isFakeRequest = typeof (request as any).getBasePath === 'function';

      const basePath = isFakeRequest
        ? (request as Record<string, any>).getBasePath()
        : http.basePath.get(request);

      const { spaceId } = getSpaceIdFromPath(basePath, http.basePath.serverBasePath);

      return spaceId;
    };

    const getScopedClient = (request: RequestFacade) => {
      if (!this.spacesClientServiceStart) {
        throw new Error('Spaces Service has not been started yet!');
      }
      return this.spacesClientServiceStart?.createSpacesClient(
        request instanceof KibanaRequest ? request : KibanaRequest.from(request)
      );
    };

    return {
      scopedClient: getScopedClient,
      getSpaceId,
      getActiveSpace: (request: RequestFacade) => {
        const spaceId = getSpaceId(request);
        return getScopedClient(request).get(spaceId);
      },
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
      clientService: this.spacesClientService!.setup(),
    };
  }

  public start(coreStart: CoreStart) {
    this.spacesClientServiceStart = this.spacesClientService!.start(coreStart);

    return {
      createSpacesClient: (request: KibanaRequest) =>
        this.spacesClientServiceStart!.createSpacesClient(request),
    };
  }

  public async stop() {
    if (this.configSubscription$) {
      this.configSubscription$.unsubscribe();
      this.configSubscription$ = undefined;
    }
  }
}
