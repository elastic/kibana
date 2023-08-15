/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  FindDatasetsRequestQuery,
  FindDatasetValue,
  FindIntegrationsRequestQuery,
  FindIntegrationsValue,
} from '../../../common/latest';

export interface DatasetsServiceSetup {
  client: IDatasetsClient;
}

export interface DatasetsServiceSetupDeps {
  http: HttpStart;
}

export type DatasetsServiceStart = void;

export interface IDatasetsClient {
  findDatasets(params?: FindDatasetsRequestQuery): Promise<FindDatasetValue>;
  findIntegrations(params?: FindIntegrationsRequestQuery): Promise<FindIntegrationsValue>;
}
