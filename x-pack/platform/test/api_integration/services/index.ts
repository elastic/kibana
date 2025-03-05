/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { AiopsProvider } from './aiops';
import { DataViewApiProvider } from './data_view_api';
import { IngestPipelinesProvider } from './ingest_pipelines';
import { FleetAndAgents } from './fleet_and_agents';
import { MachineLearningProvider } from './ml';
import { TransformProvider } from './transform';
import { UsageAPIProvider } from './usage_api';
import { SpacesServiceProvider } from './spaces';

export const services = {
  ...commonFunctionalServices,
  aiops: AiopsProvider,
  dataViewApi: DataViewApiProvider,
  ingestPipelines: IngestPipelinesProvider,
  fleetAndAgents: FleetAndAgents,
  ml: MachineLearningProvider,
  spaces: SpacesServiceProvider,
  usageAPI: UsageAPIProvider,
  transform: TransformProvider,
};
