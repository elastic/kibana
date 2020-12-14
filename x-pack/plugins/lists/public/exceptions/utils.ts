/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '../../common/constants';
import { NamespaceType } from '../../common/schemas';
import { SavedObjectType } from '../../server/saved_objects';
import { getSavedObjectTypes } from '../../server/services/exception_lists/utils';

import { ExceptionListFilter, ExceptionListIdentifiers } from './types';

export const getIdsAndNamespaces = ({
  lists,
  showDetection,
  showEndpoint,
}: {
  lists: ExceptionListIdentifiers[];
  showDetection: boolean;
  showEndpoint: boolean;
}): { ids: string[]; namespaces: NamespaceType[] } =>
  lists
    .filter((list) => {
      if (showDetection) {
        return list.type === 'detection';
      } else if (showEndpoint) {
        return list.type === 'endpoint';
      } else {
        return true;
      }
    })
    .reduce<{ ids: string[]; namespaces: NamespaceType[] }>(
      (acc, { listId, namespaceType }) => ({
        ids: [...acc.ids, listId],
        namespaces: [...acc.namespaces, namespaceType],
      }),
      { ids: [], namespaces: [] }
    );

export const getGeneralFilters = (
  filters: ExceptionListFilter,
  namespaceTypes: SavedObjectType[]
): string => {
  return Object.keys(filters)
    .map((filterKey) => {
      const value = filters[filterKey];
      if (value != null) {
        const filtersByNamespace = namespaceTypes
          .map((namespace) => {
            return `${namespace}.attributes.${filterKey}:${value}*`;
          })
          .join(' OR ');
        return `(${filtersByNamespace})`;
      } else return null;
    })
    .filter((item) => item != null)
    .join(' AND ');
};

export const getTrustedAppsFilter = (
  showTrustedApps: boolean,
  namespaceTypes: SavedObjectType[]
): string => {
  if (showTrustedApps) {
    const filters = namespaceTypes.map((namespace) => {
      return `${namespace}.attributes.list_id: ${ENDPOINT_TRUSTED_APPS_LIST_ID}*`;
    });
    return `(${filters.join(' OR ')})`;
  } else {
    const filters = namespaceTypes.map((namespace) => {
      return `not ${namespace}.attributes.list_id: ${ENDPOINT_TRUSTED_APPS_LIST_ID}*`;
    });
    return `(${filters.join(' AND ')})`;
  }
};

export const getFilters = (
  filters: ExceptionListFilter,
  namespaceTypes: NamespaceType[],
  showTrustedApps: boolean
): string => {
  const namespaces = getSavedObjectTypes({ namespaceType: namespaceTypes });
  const generalFilters = getGeneralFilters(filters, namespaces);
  const trustedAppsFilter = getTrustedAppsFilter(showTrustedApps, namespaces);
  return [generalFilters, trustedAppsFilter].filter((filter) => filter.trim() !== '').join(' AND ');
};
