/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';

import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '../../common/constants';
import { NamespaceType } from '../../common/schemas';
import { NamespaceTypeArray } from '../../common/schemas/types/default_namespace_array';
import {
  SavedObjectType,
  exceptionListAgnosticSavedObjectType,
  exceptionListSavedObjectType,
} from '../../common/types';

import { ExceptionListFilter, ExceptionListIdentifiers } from './types';

export const getSavedObjectType = ({
  namespaceType,
}: {
  namespaceType: NamespaceType;
}): SavedObjectType => {
  if (namespaceType === 'agnostic') {
    return exceptionListAgnosticSavedObjectType;
  } else {
    return exceptionListSavedObjectType;
  }
};

export const getSavedObjectTypes = ({
  namespaceType,
}: {
  namespaceType: NamespaceTypeArray;
}): SavedObjectType[] => {
  return namespaceType.map((singleNamespaceType) =>
    getSavedObjectType({ namespaceType: singleNamespaceType })
  );
};

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
      const value = get(filterKey, filters);
      if (value != null && value.trim() !== '') {
        const filtersByNamespace = namespaceTypes
          .map((namespace) => {
            const fieldToSearch = filterKey === 'name' ? 'name.text' : filterKey;
            return `${namespace}.attributes.${fieldToSearch}:${value}`;
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
