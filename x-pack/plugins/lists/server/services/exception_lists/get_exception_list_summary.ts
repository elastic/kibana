/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListSummarySchema,
  FilterOrUndefined,
  IdOrUndefined,
  ListIdOrUndefined,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';

import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
} from '../../../../../../src/core/server';
import { ExceptionListSoSchema } from '../../schemas/saved_objects';

interface GetExceptionListSummaryOptions {
  filter: FilterOrUndefined;
  id: IdOrUndefined;
  listId: ListIdOrUndefined;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
}

interface ByOsAggBucketType {
  key: string;
  doc_count: number;
}
interface ByOsAggType {
  by_os: {
    buckets: ByOsAggBucketType[];
  };
}

export const getExceptionListSummary = async ({
  filter,
  id,
  listId,
  savedObjectsClient,
  namespaceType,
}: GetExceptionListSummaryOptions): Promise<ExceptionListSummarySchema | null> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  let finalListId: string = listId ?? '';

  // If id and no listId, get the list by id to use the list_id for the find below
  if (listId === null && id != null) {
    try {
      const savedObject = await savedObjectsClient.get<ExceptionListSoSchema>(savedObjectType, id);
      finalListId = savedObject.attributes.list_id;
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return null;
      } else {
        throw err;
      }
    }
  }

  // only pick the items in the list and not the list definition
  const itemTypeFilter = `${savedObjectType}.attributes.type: "simple"`;
  const adjustedFilter = filter ? `(${filter}) AND ${itemTypeFilter}` : itemTypeFilter;

  const savedObject = await savedObjectsClient.find<ExceptionListSoSchema, ByOsAggType>({
    aggs: {
      by_os: {
        terms: {
          field: `${savedObjectType}.attributes.os_types`,
        },
      },
    },
    filter: adjustedFilter,
    perPage: 0,
    search: finalListId,
    searchFields: ['list_id'],
    sortField: 'tie_breaker_id',
    sortOrder: 'desc',
    type: savedObjectType,
  });

  if (!savedObject.aggregations) {
    return null;
  }

  const summary: ExceptionListSummarySchema = savedObject.aggregations.by_os.buckets.reduce(
    (acc, item: ByOsAggBucketType) => ({
      ...acc,
      [item.key]: item.doc_count,
      total: savedObject.total,
    }),
    { linux: 0, macos: 0, total: 0, windows: 0 }
  );

  return summary;
};
