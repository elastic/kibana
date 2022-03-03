/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterOrUndefined } from '@kbn/securitysolution-io-ts-list-types';
import type { SavedObjectType } from '@kbn/securitysolution-list-utils';

export const getExceptionListFilter = ({
  filter,
  savedObjectTypes,
}: {
  filter: FilterOrUndefined;
  savedObjectTypes: SavedObjectType[];
}): string => {
  const listTypesFilter = savedObjectTypes
    .map((type) => `${type}.attributes.list_type: list`)
    .join(' OR ');

  if (filter != null) {
    return `(${listTypesFilter}) AND ${filter}`;
  } else return `(${listTypesFilter})`;
};
