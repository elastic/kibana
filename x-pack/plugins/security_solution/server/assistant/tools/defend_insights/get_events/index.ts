/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Replacements } from '@kbn/elastic-assistant-common';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';

import {
  getAnonymizedValue,
  transformRawData,
  DefendInsightType,
  getRawDataOrDefault,
} from '@kbn/elastic-assistant-common';

import { getFileEventsQuery } from './get_file_events_query';
import { InvalidDefendInsightTypeError } from '../errors';

export async function getAnonymizedEvents({
  endpointIds,
  type,
  anonymizationFields,
  esClient,
  onNewReplacements,
  replacements,
}: {
  endpointIds: string[];
  type: DefendInsightType;
  anonymizationFields?: AnonymizationFieldResponse[];
  esClient: ElasticsearchClient;
  onNewReplacements?: (replacements: Replacements) => void;
  replacements?: Replacements;
}): Promise<string[]> {
  const query = getQuery(type, { endpointIds });

  return getAnonymized({
    query,
    anonymizationFields,
    esClient,
    onNewReplacements,
    replacements,
  });
}

function getQuery(type: DefendInsightType, options: { endpointIds: string[] }): SearchRequest {
  if (type === DefendInsightType.Enum.incompatible_antivirus) {
    const { endpointIds } = options;
    return getFileEventsQuery({
      endpointIds,
    });
  }

  throw new InvalidDefendInsightTypeError();
}

const getAnonymized = async ({
  query,
  anonymizationFields,
  esClient,
  onNewReplacements,
  replacements,
}: {
  query: SearchRequest;
  anonymizationFields?: AnonymizationFieldResponse[];
  esClient: ElasticsearchClient;
  onNewReplacements?: (replacements: Replacements) => void;
  replacements?: Replacements;
}): Promise<string[]> => {
  const result = await esClient.search<SearchResponse>(query);

  // Accumulate replacements locally so we can, for example use the same
  // replacement for a hostname when we see it in multiple alerts:
  let localReplacements = { ...(replacements ?? {}) };
  const localOnNewReplacements = (newReplacements: Replacements) => {
    localReplacements = { ...localReplacements, ...newReplacements };

    onNewReplacements?.(localReplacements); // invoke the callback with the latest replacements
  };

  return result.hits?.hits?.map((hit) =>
    transformRawData({
      anonymizationFields,
      currentReplacements: localReplacements, // <-- the latest local replacements
      getAnonymizedValue,
      onNewReplacements: localOnNewReplacements, // <-- the local callback
      rawData: getRawDataOrDefault(hit.fields),
    })
  );
};
