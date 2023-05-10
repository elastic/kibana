/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { FindIntegrationsRequestQuery, FindIntegrationsResponse } from '../../../common';

export type IntegrationsServiceSetup = void;

export interface IntegrationsServiceStart {
  client: IIntegrationsClient;
}

export interface IntegrationsServiceStartDeps {
  http: HttpStart;
}

export interface IIntegrationsClient {
  findIntegrations(params: FindIntegrationsRequestQuery): Promise<FindIntegrationsResponse>;
}
