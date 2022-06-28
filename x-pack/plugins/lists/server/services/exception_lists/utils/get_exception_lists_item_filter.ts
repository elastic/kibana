/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EmptyStringArrayDecoded,
  NonEmptyStringArrayDecoded,
} from '@kbn/securitysolution-io-ts-types';
import type { SavedObjectType } from '@kbn/securitysolution-list-utils';

import { escapeQuotes } from '../../utils/escape_query';

export const getExceptionListsItemFilter = ({
  filter,
  listId,
  savedObjectType,
}: {
  listId: NonEmptyStringArrayDecoded | undefined;
  filter: EmptyStringArrayDecoded;
  savedObjectType: SavedObjectType[];
}): string => {
  if (listId == null) {
    return savedObjectType.reduce((accum, soType, index) => {
      const soTypeAppend = `(${soType}.attributes.list_type: item)`;
      const listItemAppendWithFilter =
        filter[index] != null ? `(${soTypeAppend} AND ${filter[index]})` : soTypeAppend;
      if (accum === '') {
        return listItemAppendWithFilter;
      } else {
        return `${accum} OR ${listItemAppendWithFilter}`;
      }
    }, '');
  } else {
    return listId.reduce((accum, singleListId, index) => {
      const escapedListId = escapeQuotes(singleListId);
      const listItemAppend = `(${savedObjectType[index]}.attributes.list_type: item AND ${savedObjectType[index]}.attributes.list_id: "${escapedListId}")`;
      const listItemAppendWithFilter =
        filter[index] != null ? `(${listItemAppend} AND ${filter[index]})` : listItemAppend;
      if (accum === '') {
        return listItemAppendWithFilter;
      } else {
        return `${accum} OR ${listItemAppendWithFilter}`;
      }
    }, '');
  }
};
