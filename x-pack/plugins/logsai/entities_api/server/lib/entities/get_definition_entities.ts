/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { builtinEntityDefinitions } from '../../built_in_definitions_stub';
import { DefinitionEntity } from '../../../common/entities';

export async function getDefinitionEntities({
  esClient,
}: {
  esClient: ObservabilityElasticsearchClient;
}): Promise<DefinitionEntity[]> {
  return builtinEntityDefinitions;
}
