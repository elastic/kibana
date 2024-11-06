/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import { isEmpty } from 'lodash/fp';
import { ENABLE_ASSET_CRITICALITY_SETTING } from '../../../../common/constants';
import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics';
import type { AssetCriticalityDataClient } from './asset_criticality_data_client';

interface CriticalityIdentifier {
  id_field: string;
  id_value: string;
}

interface IdentifierValuesByField {
  [idField: string]: string[];
}

export interface AssetCriticalityService {
  getCriticalitiesByIdentifiers: (
    identifiers: CriticalityIdentifier[]
  ) => Promise<AssetCriticalityRecord[]>;
  isEnabled: () => Promise<boolean>;
}

const isCriticalityIdentifierValid = (identifier: CriticalityIdentifier): boolean =>
  !isEmpty(identifier.id_field) && !isEmpty(identifier.id_value);

const groupIdentifierValuesByField = (
  identifiers: CriticalityIdentifier[]
): IdentifierValuesByField =>
  identifiers.reduce((acc, id) => {
    acc[id.id_field] ??= [];
    if (!acc[id.id_field].includes(id.id_value)) {
      acc[id.id_field].push(id.id_value);
    }
    return acc;
  }, {} as IdentifierValuesByField);

const buildCriticalitiesQuery = (identifierValuesByField: IdentifierValuesByField) => ({
  bool: {
    filter: {
      bool: {
        should: Object.keys(identifierValuesByField).map((idField) => ({
          bool: {
            must: [
              { term: { id_field: idField } },
              { terms: { id_value: identifierValuesByField[idField] } },
            ],
          },
        })),
      },
    },
  },
});

const getCriticalitiesByIdentifiers = async ({
  assetCriticalityDataClient,
  identifiers,
}: {
  assetCriticalityDataClient: AssetCriticalityDataClient;
  identifiers: CriticalityIdentifier[];
}): Promise<AssetCriticalityRecord[]> => {
  if (identifiers.length === 0) {
    throw new Error('At least one identifier must be provided');
  }
  const validIdentifiers = identifiers.filter((id) => isCriticalityIdentifierValid(id));

  if (validIdentifiers.length === 0) {
    throw new Error('At least one identifier must contain a valid field and value');
  }

  const identifierCount = validIdentifiers.length;
  const identifierValuesByField = groupIdentifierValuesByField(validIdentifiers);
  const criticalitiesQuery = buildCriticalitiesQuery(identifierValuesByField);

  const criticalitySearchResponse = await assetCriticalityDataClient.search({
    query: criticalitiesQuery,
    size: identifierCount,
  });

  // @ts-expect-error @elastic/elasticsearch _source is optional
  return criticalitySearchResponse.hits.hits.map((hit) => hit._source);
};

interface AssetCriticalityServiceFactoryOptions {
  assetCriticalityDataClient: AssetCriticalityDataClient;
  uiSettingsClient: IUiSettingsClient;
}

export const assetCriticalityServiceFactory = ({
  assetCriticalityDataClient,
  uiSettingsClient,
}: AssetCriticalityServiceFactoryOptions): AssetCriticalityService => ({
  getCriticalitiesByIdentifiers: (identifiers: CriticalityIdentifier[]) =>
    getCriticalitiesByIdentifiers({ assetCriticalityDataClient, identifiers }),
  isEnabled: () => uiSettingsClient.get<boolean>(ENABLE_ASSET_CRITICALITY_SETTING),
});
