/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Replacements } from '@kbn/elastic-assistant-common';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';

import { getAnonymizedValue, transformRawData } from '@kbn/elastic-assistant-common';

import type { DefendInsightsType } from '../../../../common/endpoint/types/defend_insights';

import { getRawDataOrDefault } from '../open_and_acknowledged_alerts/helpers';
import { getProcessEventsQuery } from './get_process_events_query';
import { InvalidDefendInsightTypeError } from './errors';

export const getAnonymizedEvents = async ({
  endpointIds,
  type,
  anonymizationFields,
  esClient,
  onNewReplacements,
  replacements,
}: {
  endpointIds: string[];
  type: DefendInsightsType;
  anonymizationFields?: AnonymizationFieldResponse[];
  esClient: ElasticsearchClient;
  onNewReplacements?: (replacements: Replacements) => void;
  replacements?: Replacements;
}): Promise<string[]> => {
  if (type === 'conflicting_antivirus') {
    return getAnonymizedProcesses({
      endpointIds,
      anonymizationFields,
      esClient,
      onNewReplacements,
      replacements,
    });
  }

  throw new InvalidDefendInsightTypeError();
};

const getAnonymizedProcesses = async ({
  endpointIds,
  anonymizationFields,
  esClient,
  onNewReplacements,
  replacements,
}: {
  endpointIds: string[];
  anonymizationFields?: AnonymizationFieldResponse[];
  esClient: ElasticsearchClient;
  onNewReplacements?: (replacements: Replacements) => void;
  replacements?: Replacements;
}): Promise<string[]> => {
  const query = getProcessEventsQuery({
    endpointIds,
    anonymizationFields: anonymizationFields ?? [],
  });

  const result = await esClient.search<SearchResponse>(query);

  // Accumulate replacements locally so we can, for example use the same
  // replacement for a hostname when we see it in multiple alerts:
  let localReplacements = { ...(replacements ?? {}) };
  const localOnNewReplacements = (newReplacements: Replacements) => {
    localReplacements = { ...localReplacements, ...newReplacements };

    onNewReplacements?.(localReplacements); // invoke the callback with the latest replacements
  };

  return result.hits?.hits?.map((x) =>
    transformRawData({
      anonymizationFields,
      currentReplacements: localReplacements, // <-- the latest local replacements
      getAnonymizedValue,
      onNewReplacements: localOnNewReplacements, // <-- the local callback
      rawData: getRawDataOrDefault(x.fields),
    })
  );
};
