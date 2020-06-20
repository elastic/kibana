/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClient } from '../../../../../src/core/server';
import { ExceptionListClient } from '../../../lists';
import { EndpointAppContextService } from './endpoint_app_context_services';
import { Manifest } from './artifacts/manifest';

/**
 * A singleton that holds shared services for working with artifacts.
 */
export class ArtifactService {
  private endpointAppContextService: EndpointAppContextService | undefined;
  private exceptionListClient: ExceptionListClient | undefined;
  private savedObjectsClient: SavedObjectsClient | undefined;

  private manifest: Manifest | undefined;

  public start(deps: {
    endpointAppContextService: EndpointAppContextService,
    exceptionListClient; ExceptionListClient,
    savedObjectsClient: SavedObjectsClient,
  }) {
    this.endpointAppContextService = deps.endpointAppContextService;
    this.exceptionListClient = deps.exceptionListClient;
    this.savedObjectsClient = deps.savedObjectsClient;
  }

  public stop() {}
}
