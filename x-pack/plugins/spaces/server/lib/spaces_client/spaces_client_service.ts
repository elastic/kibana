/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import {
  KibanaRequest,
  CoreStart,
  ISavedObjectsRepository,
  SavedObjectsServiceStart,
} from 'src/core/server';
import { ConfigType } from '../../config';
import { SpacesClient, ISpacesClient } from './spaces_client';

export type SpacesClientWrapper = (
  request: KibanaRequest,
  baseClient: ISpacesClient
) => ISpacesClient;

export type SpacesClientRepositoryFactory = (
  request: KibanaRequest,
  savedObjectsStart: SavedObjectsServiceStart
) => ISavedObjectsRepository;

export interface SpacesClientServiceSetup {
  /**
   * Sets the factory that should be used to create the Saved Objects Repository
   * whenever a new instance of the SpacesClient is created. By default, a repository
   * scoped the current user will be created.
   */
  setClientRepositoryFactory: (factory: SpacesClientRepositoryFactory) => void;

  /**
   * Sets the client wrapper that should be used to optionally "wrap" each instance of the SpacesClient.
   * By default, an unwrapped client will be created.
   *
   * Unlike the SavedObjectsClientWrappers, this service only supports a single wrapper. It is not possible
   * to register multiple wrappers at this time.
   */
  registerClientWrapper: (wrapper: SpacesClientWrapper) => void;
}

export interface SpacesClientServiceStart {
  /**
   * Creates an instance of the SpacesClient scoped to the provided request.
   */
  createSpacesClient: (request: KibanaRequest) => ISpacesClient;
}

interface SetupDeps {
  config$: Observable<ConfigType>;
}

export class SpacesClientService {
  private repositoryFactory?: SpacesClientRepositoryFactory;

  private config?: ConfigType;

  private clientWrapper?: SpacesClientWrapper;

  constructor(private readonly debugLogger: (message: string) => void) {}

  public setup({ config$ }: SetupDeps): SpacesClientServiceSetup {
    config$.subscribe((nextConfig) => {
      this.config = nextConfig;
    });

    return {
      setClientRepositoryFactory: (repositoryFactory: SpacesClientRepositoryFactory) => {
        if (this.repositoryFactory) {
          throw new Error(`Repository factory has already been set`);
        }
        this.repositoryFactory = repositoryFactory;
      },
      registerClientWrapper: (wrapper: SpacesClientWrapper) => {
        if (this.clientWrapper) {
          throw new Error(`Client wrapper has already been set`);
        }
        this.clientWrapper = wrapper;
      },
    };
  }

  public start(coreStart: CoreStart): SpacesClientServiceStart {
    if (!this.repositoryFactory) {
      this.repositoryFactory = (request, savedObjectsStart) =>
        savedObjectsStart.createScopedRepository(request, ['space']);
    }
    return {
      createSpacesClient: (request: KibanaRequest) => {
        if (!this.config) {
          throw new Error('Initialization error: spaces config is not available');
        }

        const baseClient = new SpacesClient(
          this.debugLogger,
          this.config,
          this.repositoryFactory!(request, coreStart.savedObjects)
        );
        if (this.clientWrapper) {
          return this.clientWrapper(request, baseClient);
        }
        return baseClient;
      },
    };
  }
}
