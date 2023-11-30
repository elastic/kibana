/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getAssetCriticalityIndex } from '../../../../common/asset_criticality';
import type { AssetCriticalityRecord } from '../../../../common/api/asset_criticality';

interface CriticalityIdentifier {
  id_field: string;
  id_value: string;
}

interface IdentifierValuesByField {
  [idField: string]: string[];
}

const isCriticalityIdentifierValid = (identifier: CriticalityIdentifier): boolean =>
  !isEmpty(identifier.id_field) && !isEmpty(identifier.id_value);

const groupIdentifierValuesByField = (
  identifiers: CriticalityIdentifier[]
): IdentifierValuesByField =>
  identifiers.reduce((acc, id) => {
    if (!acc[id.id_field]) {
      acc[id.id_field] = [];
    }
    if (!acc[id.id_field].includes(id.id_value)) {
      acc[id.id_field].push(id.id_value);
    }
    return acc;
  }, {} as IdentifierValuesByField);

const buildCriticalitiesQuery = (identifierValuesByField: IdentifierValuesByField) => ({
  bool: {
    must: {
      bool: {
        should: Object.keys(identifierValuesByField).map((idField) => ({
          terms: { [idField]: identifierValuesByField[idField] },
        })),
      },
    },
  },
});

const MAX_CRITICALITY_RECORD_COUNT = 10000; // TODO what's the right value here?

const getCriticalitiesByIdentifiers = async ({
  esClient,
  identifiers,
}: {
  esClient: ElasticsearchClient;
  identifiers: CriticalityIdentifier[];
}): Promise<AssetCriticalityRecord[]> => {
  if (identifiers.length === 0) {
    throw new Error('At least one identifier must be provided');
  }
  const validIdentifiers = identifiers.filter((id) => isCriticalityIdentifierValid(id));

  if (validIdentifiers.length === 0) {
    throw new Error('At least one identifier must contain a valid field and value');
  }

  const identifierValuesByField = groupIdentifierValuesByField(validIdentifiers);
  const criticalitiesQuery = buildCriticalitiesQuery(identifierValuesByField);

  const criticalitySearchResponse = await esClient.search<AssetCriticalityRecord>({
    index: getAssetCriticalityIndex('default'), // TODO use context from data client?
    body: {
      query: criticalitiesQuery,
    },
    size: MAX_CRITICALITY_RECORD_COUNT,
  });

  // @ts-expect-error @elastic/elasticsearch _source is optional
  return criticalitySearchResponse.hits.hits.map((hit) => hit._source);
};

interface AssetCriticalityServiceFactoryOptions {
  esClient: ElasticsearchClient;
}

export const assetCriticalityServiceFactory = ({
  esClient,
}: AssetCriticalityServiceFactoryOptions) => ({
  getCriticalitiesByIdentifiers: (identifiers: CriticalityIdentifier[]) =>
    getCriticalitiesByIdentifiers({ esClient, identifiers }),
});
