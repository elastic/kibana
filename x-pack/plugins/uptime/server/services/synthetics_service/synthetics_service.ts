/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */
import type {
  KibanaRequest,
  KibanaResponseFactory,
  SavedObjectsClientContract,
} from 'kibana/server';
import { SyntheticsMonitor } from '../../../common/runtime_types';
import { addSyntheticMonitor } from '../../lib/requests/add_monitor';
import { UptimeServerSetup } from '../../lib/adapters';

export interface SyntheticsService {
  asScoped(request: KibanaRequest): SyntheticsClient;
}

export interface SyntheticsClient {
  addMonitor(
    request: KibanaRequest<SyntheticsMonitor>,
    response: KibanaResponseFactory
  ): Promise<any>;
}

export class SyntheticsServiceImpl implements SyntheticsService {
  constructor(
    private readonly internalSoClient: SavedObjectsClientContract,
    private readonly server: UptimeServerSetup
  ) {}

  public asScoped(request: KibanaRequest) {
    const preflightCheck = () => {
      // implement permissions check for preflight request
      // ADD feature flag to preflight request
      // if (!checkPermissions(request)) {
      //   throw new Error(
      //     `User does not have adequate permissions to access create Synthetics packages packages.`
      //   );
      // }
    };

    return new SyntheticsClientImpl(this.internalSoClient, this.server, preflightCheck);
  }
}

class SyntheticsClientImpl implements SyntheticsClient {
  constructor(
    private readonly internalSoClient: SavedObjectsClientContract,
    private readonly server: UptimeServerSetup,
    private readonly preflightCheck?: () => void | Promise<void>
  ) {}

  public async addMonitor(
    request: KibanaRequest<SyntheticsMonitor>,
    response: KibanaResponseFactory
  ): Promise<any> {
    await this.#runPreflight();
    return addSyntheticMonitor({
      request,
      response,
      savedObjectsClient: this.internalSoClient,
      server: this.server,
    });
  }

  #runPreflight() {
    if (this.preflightCheck) {
      return this.preflightCheck();
    }
  }
}
