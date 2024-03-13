/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Replacement } from '@kbn/elastic-assistant-common';
import { getAnonymizedValue, transformRawData } from '@kbn/elastic-assistant-common';
import { DynamicTool } from 'langchain/tools';
import { requestHasRequiredAnonymizationParams } from '@kbn/elastic-assistant-plugin/server/lib/langchain/helpers';

import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { getOpenAndAcknowledgedAlertsQuery } from './get_open_and_acknowledged_alerts_query';
import { getRawDataOrDefault, sizeIsOutOfRange } from './helpers';
import { APP_UI_ID } from '../../../../common';

export interface OpenAndAcknowledgedAlertsToolParams extends AssistantToolParams {
  alertsIndexPattern: string;
  size: number;
}

export const OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL_DESCRIPTION =
  'Call this for knowledge about the latest n open and acknowledged alerts (sorted by `kibana.alert.risk_score`) in the environment, or when answering questions about open alerts';

/**
 * Returns a tool for querying open and acknowledged alerts, or null if the
 * request doesn't have all the required parameters.
 */
export const OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL: AssistantTool = {
  id: 'open-and-acknowledged-alerts-tool',
  name: 'OpenAndAcknowledgedAlertsTool',
  description: OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL_DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is OpenAndAcknowledgedAlertsToolParams => {
    const { alertsIndexPattern, request, size } = params;
    return (
      requestHasRequiredAnonymizationParams(request) &&
      alertsIndexPattern != null &&
      size != null &&
      !sizeIsOutOfRange(size)
    );
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const {
      alertsIndexPattern,
      allow,
      allowReplacement,
      esClient,
      onNewReplacements,
      replacements,
      size,
    } = params as OpenAndAcknowledgedAlertsToolParams;
    return new DynamicTool({
      name: 'OpenAndAcknowledgedAlertsTool',
      description: OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL_DESCRIPTION,
      func: async () => {
        const query = getOpenAndAcknowledgedAlertsQuery({
          alertsIndexPattern,
          allow: allow ?? [],
          size,
        });

        const result = await esClient.search<SearchResponse>(query);

        // Accumulate replacements locally so we can, for example use the same
        // replacement for a hostname when we see it in multiple alerts:
        let localReplacements: Replacement[] = replacements ?? [];
        const localOnNewReplacements = (newReplacements: Replacement[]) => {
          const localReplacementsDict = localReplacements.reduce(
            (acc: Record<string, string>, r) => {
              acc[r.value] = r.uuid;
              return acc;
            },
            {}
          );
          const newReplacementsDict = newReplacements.reduce((acc: Record<string, string>, r) => {
            acc[r.value] = r.uuid;
            return acc;
          }, {});
          const updatedReplacements = { ...localReplacementsDict, ...newReplacementsDict };
          localReplacements = Object.keys(updatedReplacements).map((key) => ({
            value: key,
            uuid: updatedReplacements[key],
          }));
          onNewReplacements?.(localReplacements); // invoke the callback with the latest replacements
          return Promise.resolve(localReplacements);
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
      tags: ['alerts', 'open-and-acknowledged-alerts'],
    });
  },
};
