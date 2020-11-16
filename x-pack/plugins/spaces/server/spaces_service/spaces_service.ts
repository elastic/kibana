/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subscription } from 'rxjs';
import type { Logger, KibanaRequest, CoreSetup, CoreStart, IBasePath } from 'src/core/server';
import {
  SpacesClientService,
  SpacesClientServiceSetup,
  SpacesClientServiceStart,
} from '../lib/spaces_client';
import { ConfigType } from '../config';
import { getSpaceIdFromPath } from '../../common/lib/spaces_url_parser';
import { DEFAULT_SPACE_ID } from '../../common/constants';
import { spaceIdToNamespace, namespaceToSpaceId } from '../lib/utils/namespace';
import { Space } from '..';

export interface SpacesServiceSetup {
  /**
   * Customize the construction of the SpacesClient.
   *
   * @private
   */
  clientService: SpacesClientServiceSetup;

  /**
   * Retrieves the space id associated with the provided request.
   * @param request
   *
   * @deprecated Use `getSpaceId` from the `SpacesServiceStart` contract instead.
   */
  getSpaceId(request: KibanaRequest): string;

  /**
   * Converts the provided space id into the corresponding Saved Objects `namespace` id.
   * @param spaceId
   *
   * @deprecated use `spaceIdToNamespace` from the `SpacesServiceStart` contract instead.
   */
  spaceIdToNamespace(spaceId: string): string | undefined;

  /**
   * Converts the provided namespace into the corresponding space id.
   * @param namespace
   *
   * @deprecated use `namespaceToSpaceId` from the `SpacesServiceStart` contract instead.
   */
  namespaceToSpaceId(namespace: string | undefined): string;
}

export interface SpacesServiceStart {
  /**
   * Creates a scoped instance of the SpacesClient.
   */
  createSpacesClient: SpacesClientServiceStart['createSpacesClient'];

  /**
   * Retrieves the space id associated with the provided request.
   * @param request
   */
  getSpaceId(request: KibanaRequest): string;

  /**
   * Indicates if the provided request is executing within the context of the `default` space.
   * @param request
   */
  isInDefaultSpace(request: KibanaRequest): boolean;

  /**
   * Retrieves the Space associated with the provided request.
   * @param request
   */
  getActiveSpace(request: KibanaRequest): Promise<Space>;

  /**
   * Converts the provided space id into the corresponding Saved Objects `namespace` id.
   * @param spaceId
   */
  spaceIdToNamespace(spaceId: string): string | undefined;

  /**
   * Converts the provided namespace into the corresponding space id.
   * @param namespace
   */
  namespaceToSpaceId(namespace: string | undefined): string;
}

interface SpacesServiceDeps {
  http: CoreSetup['http'];
  config$: Observable<ConfigType>;
}

export class SpacesService {
  private configSubscription$?: Subscription;

  private readonly spacesClientService: SpacesClientService;

  private spacesClientServiceStart?: ReturnType<SpacesClientService['start']>;

  constructor(private readonly log: Logger) {
    this.spacesClientService = new SpacesClientService((message: string) =>
      this.log.debug(message)
    );
  }

  public setup({ http, config$ }: SpacesServiceDeps): SpacesServiceSetup {
    return {
      getSpaceId: (request: KibanaRequest) => {
        return this.getSpaceId(request, http.basePath);
      },
      spaceIdToNamespace,
      namespaceToSpaceId,
      clientService: this.spacesClientService.setup({ config$ }),
    };
  }

  public start(coreStart: CoreStart) {
    this.spacesClientServiceStart = this.spacesClientService!.start(coreStart);

    const getScopedClient = (request: KibanaRequest) => {
      if (!this.spacesClientServiceStart) {
        throw new Error('Spaces Service has not been started yet!');
      }
      return this.spacesClientServiceStart?.createSpacesClient(request);
    };

    return {
      getSpaceId: (request: KibanaRequest) => {
        return this.getSpaceId(request, coreStart.http.basePath);
      },

      getActiveSpace: (request: KibanaRequest) => {
        const spaceId = this.getSpaceId(request, coreStart.http.basePath);
        return getScopedClient(request).get(spaceId);
      },

      isInDefaultSpace: (request: KibanaRequest) => {
        const spaceId = this.getSpaceId(request, coreStart.http.basePath);

        return spaceId === DEFAULT_SPACE_ID;
      },

      createSpacesClient: (request: KibanaRequest) =>
        this.spacesClientServiceStart!.createSpacesClient(request),

      spaceIdToNamespace,
      namespaceToSpaceId,
    };
  }

  public async stop() {
    if (this.configSubscription$) {
      this.configSubscription$.unsubscribe();
      this.configSubscription$ = undefined;
    }
  }

  private getSpaceId(request: KibanaRequest, basePathService: IBasePath) {
    const basePath = basePathService.get(request);

    const { spaceId } = getSpaceIdFromPath(basePath, basePathService.serverBasePath);

    return spaceId;
  }
}
