/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  DATASET_FIELD,
  AGENT_DATASET,
  AGENT_DATASET_PATTERN,
  LOG_LEVEL_FIELD,
  AGENT_ID_FIELD,
} from './constants';

export const buildQuery = ({
  agentId,
  datasets,
  logLevels,
  userQuery,
}: {
  agentId: string;
  datasets: string[];
  logLevels: string[];
  userQuery: string;
}): string => {
  // Filter on agent ID
  const agentIdQuery = `${AGENT_ID_FIELD.name}:${agentId}`;

  // Filter on selected datasets if given, fall back to filtering on dataset: elastic_agent|elastic_agent.*
  const datasetQuery = datasets.length
    ? datasets.map((dataset) => `${DATASET_FIELD.name}:${dataset}`).join(' or ')
    : `${DATASET_FIELD.name}:${AGENT_DATASET} or ${DATASET_FIELD.name}:${AGENT_DATASET_PATTERN}`;

  // Filter on log levels
  const logLevelQuery = logLevels.map((level) => `${LOG_LEVEL_FIELD.name}:${level}`).join(' or ');

  // Agent ID + datasets query
  const agentQuery = `${agentIdQuery} and (${datasetQuery})`;

  // Agent ID + datasets + log levels query
  const baseQuery = logLevelQuery ? `${agentQuery} and (${logLevelQuery})` : agentQuery;

  // Agent ID + datasets + log levels + user input query
  const finalQuery = userQuery ? `(${baseQuery}) and (${userQuery})` : baseQuery;

  return finalQuery;
};
