/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { CONNECTORS_INDEX } from '../..';
import {
  Connector,
  FilteringRule,
  FilteringRules,
  FilteringValidationState,
} from '../../../common/types/connectors';

import { fetchConnectorById } from './fetch_connectors';

export const updateFilteringDraft = async (
  client: IScopedClusterClient,
  connectorId: string,
  {
    advancedSnippet,
    filteringRules,
  }: {
    advancedSnippet: string;
    filteringRules: FilteringRule[];
  }
): Promise<FilteringRules | undefined> => {
  const now = new Date().toISOString();
  const parsedAdvancedSnippet: Record<string, unknown> = advancedSnippet
    ? JSON.parse(advancedSnippet)
    : {};
  const parsedFilteringRules = filteringRules.map((filteringRule) => ({
    ...filteringRule,
    created_at: filteringRule.created_at ? filteringRule.created_at : now,
    updated_at: now,
  }));
  const draft: FilteringRules = {
    advanced_snippet: {
      created_at: now,
      updated_at: now,
      value: parsedAdvancedSnippet,
    },
    rules: parsedFilteringRules,
    validation: {
      errors: [],
      state: FilteringValidationState.EDITED,
    },
  };
  const connectorResult = await fetchConnectorById(client, connectorId);
  if (!connectorResult) {
    throw new Error(`Could not find connector with id ${connectorId}`);
  }
  const { value: connector, seqNo, primaryTerm } = connectorResult;

  const result = await client.asCurrentUser.update<Connector>({
    doc: { ...connector, filtering: [{ ...connector.filtering[0], draft }] },
    id: connectorId,
    if_primary_term: primaryTerm,
    if_seq_no: seqNo,
    index: CONNECTORS_INDEX,
    refresh: true,
  });

  return result.result === 'updated' ? draft : undefined;
};
