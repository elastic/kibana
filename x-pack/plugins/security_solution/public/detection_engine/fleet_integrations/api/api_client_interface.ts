/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetInstalledIntegrationsResponse } from '../../../../common/detection_engine/fleet_integrations';

export interface IFleetIntegrationsApiClient {
  /**
   * Fetch all installed integrations.
   * @throws An error if response is not OK
   */
  fetchInstalledIntegrations(
    args: FetchInstalledIntegrationsArgs
  ): Promise<GetInstalledIntegrationsResponse>;
}

export interface FetchInstalledIntegrationsArgs {
  /**
   * Array of Fleet packages to filter for.
   */
  packages?: string[];

  /**
   * Optional signal for cancelling the request.
   */
  signal?: AbortSignal;
}
