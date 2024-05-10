/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  AttackDiscoveryPostRequestBody,
  ExecuteConnectorRequestBody,
  Replacements,
} from '@kbn/elastic-assistant-common';
import { ActionsClientLlm } from '@kbn/elastic-assistant-common/impl/language_models';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { v4 as uuidv4 } from 'uuid';

import { AssistantToolParams } from '../../types';

export const REQUIRED_FOR_ATTACK_DISCOVERY: AnonymizationFieldResponse[] = [
  {
    id: uuidv4(),
    field: '_id',
    allowed: true,
    anonymized: true,
  },
  {
    id: uuidv4(),
    field: 'kibana.alert.original_time',
    allowed: true,
    anonymized: false,
  },
];

export const getAssistantToolParams = ({
  alertsIndexPattern,
  anonymizationFields,
  esClient,
  latestReplacements,
  llm,
  onNewReplacements,
  request,
  size,
}: {
  alertsIndexPattern: string;
  anonymizationFields?: AnonymizationFieldResponse[];
  esClient: ElasticsearchClient;
  latestReplacements: Replacements;
  llm: ActionsClientLlm;
  onNewReplacements: (newReplacements: Replacements) => void;
  request: KibanaRequest<
    unknown,
    unknown,
    ExecuteConnectorRequestBody | AttackDiscoveryPostRequestBody
  >;
  size: number;
}): AssistantToolParams => ({
  alertsIndexPattern,
  anonymizationFields: [...(anonymizationFields ?? []), ...REQUIRED_FOR_ATTACK_DISCOVERY],
  isEnabledKnowledgeBase: false, // not required for attack discovery
  chain: undefined, // not required for attack discovery
  esClient,
  llm,
  modelExists: false, // not required for attack discovery
  onNewReplacements,
  replacements: latestReplacements,
  request,
  size,
});
