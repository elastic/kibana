/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { builtinPivotTypes } from '../built_in_pivots_stub';
import { PivotEntity } from '../../common';

export async function getPivotEntities({
  esClient,
}: {
  esClient: ObservabilityElasticsearchClient;
}): Promise<PivotEntity[]> {
  return builtinPivotTypes;
}
