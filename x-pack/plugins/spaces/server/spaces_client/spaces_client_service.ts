/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

import type {
  CoreStart,
  ISavedObjectsRepository,
  KibanaRequest,
  SavedObjectsServiceStart,
} from 'src/core/server';

import type { ConfigType } from '../config';
import type { ISpacesClient } from './spaces_client';
import { SpacesClient } from './spaces_client';

/**
 * For consumption by the security plugin only.
 * @private
 */
export type SpacesClientWrapper = (
  request: KibanaRequest,
  baseClient: ISpacesClient
) => ISpacesClient;

/**
 * For consumption by the security plugin only.
 * @private
 */
export type SpacesClientRepositoryFactory = (
  request: KibanaRequest,
  savedObjectsStart: SavedObjectsServiceStart
) => ISavedObjectsRepository;

export interface SpacesClientServiceSetup {
  /**
   * Sets the factory that should be used to create the Saved Objects Repository
   * whenever a new instance of the SpacesClient is created. By default, a repository
   * scoped to the current user will be created.
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
    const nonGlobalTypes = coreStart.savedObjects
      .getTypeRegistry()
      .getAllTypes()
      .filter((x) => x.namespaceType !== 'agnostic');
    const nonGlobalTypeNames = nonGlobalTypes.map((x) => x.name);

    if (!this.repositoryFactory) {
      const hiddenTypeNames = nonGlobalTypes.filter((x) => x.hidden).map((x) => x.name);
      this.repositoryFactory = (request, savedObjectsStart) =>
        savedObjectsStart.createScopedRepository(request, [...hiddenTypeNames, 'space']);
    }

    return {
      createSpacesClient: (request: KibanaRequest) => {
        if (!this.config) {
          throw new Error('Initialization error: spaces config is not available');
        }
        const baseClient = new SpacesClient(
          this.debugLogger,
          this.config,
          this.repositoryFactory!(request, coreStart.savedObjects),
          nonGlobalTypeNames
        );
        if (this.clientWrapper) {
          return this.clientWrapper(request, baseClient);
        }
        return baseClient;
      },
    };
  }
}
