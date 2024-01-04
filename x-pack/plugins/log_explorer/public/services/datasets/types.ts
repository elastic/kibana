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

export type DatasetsServiceSetup = void;

export interface DatasetsServiceStart {
  client: IDatasetsClient;
}

export interface DatasetsServiceStartDeps {
  http: HttpStart;
}

export interface IDatasetsClient {
  findDatasets(params?: FindDatasetsRequestQuery): Promise<FindDatasetValue>;
  findIntegrations(params?: FindIntegrationsRequestQuery): Promise<FindIntegrationsValue>;
}
