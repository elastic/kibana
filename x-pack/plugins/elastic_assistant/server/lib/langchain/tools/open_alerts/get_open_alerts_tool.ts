/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { KibanaRequest } from '@kbn/core-http-server';
import { getAnonymizedValue, transformRawData } from '@kbn/elastic-assistant-common';
import { DynamicTool, Tool } from 'langchain/tools';
import { requestHasRequiredAnonymizationParams } from '../../helpers';
import { RequestBody } from '../../types';

import { getOpenAlertsQuery } from './get_open_alerts_query';
import { getRawDataOrDefault, sizeIsOutOfRange } from './helpers';

export const OPEN_ALERTS_TOOL_DESCRIPTION =
  'Call this for knowledge about the latest n open alerts (sorted by `kibana.alert.risk_score`) in the environment, or when answering questions about open alerts';

/**
 * Returns a tool for querying open alerts, or null if the request
 * doesn't have all the required parameters.
 */
export const getOpenAlertsTool = ({
  alertsIndexPattern,
  allow,
  allowReplacement,
  esClient,
  onNewReplacements,
  replacements,
  request,
  size,
}: {
  alertsIndexPattern?: string;
  allow?: string[];
  allowReplacement?: string[];
  esClient: ElasticsearchClient;
  onNewReplacements?: (newReplacements: Record<string, string>) => void;
  replacements?: Record<string, string>;
  request: KibanaRequest<unknown, unknown, RequestBody>;
  size?: number;
}): Tool | null => {
  if (
    !requestHasRequiredAnonymizationParams(request) ||
    alertsIndexPattern == null ||
    size == null ||
    sizeIsOutOfRange(size)
  ) {
    return null;
  }

  return new DynamicTool({
    name: 'open-alerts',
    description: OPEN_ALERTS_TOOL_DESCRIPTION,
    func: async () => {
      const query = getOpenAlertsQuery({
        alertsIndexPattern,
        allow: allow ?? [],
        size,
      });

      const result = await esClient.search<SearchResponse>(query);

      // Accumulate replacements locally so we can, for example use the same
      // replacement for a hostname when we see it in multiple alerts:
      let localReplacements = { ...replacements };
      const localOnNewReplacements = (newReplacements: Record<string, string>) => {
        localReplacements = { ...localReplacements, ...newReplacements }; // update the local state

        onNewReplacements?.(localReplacements); // invoke the callback with the latest replacements
      };

      return JSON.stringify(
        result.hits?.hits?.map((x) =>
          transformRawData({
            allow: allow ?? [],
            allowReplacement: allowReplacement ?? [],
            currentReplacements: localReplacements, // <-- the latest local replacements
            getAnonymizedValue,
            onNewReplacements: localOnNewReplacements, // <-- the local callback
            rawData: getRawDataOrDefault(x.fields),
          })
        )
      );
    },
    tags: ['alerts', 'open-alerts'],
  });
};
