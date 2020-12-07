/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';

import { Type } from '../../../common/schemas';

export type QueryFilterType = [
  { term: Record<string, unknown> },
  { terms: Record<string, unknown[]> } | { bool: {} }
];

export const getQueryFilterFromTypeValue = ({
  type,
  value,
  listId,
}: {
  type: Type;
  value: unknown[];
  listId: string;
}): QueryFilterType => {
  const valueFlattened = value.flat(Infinity).filter((singleValue) => singleValue != null);
  if (isEmpty(valueFlattened)) {
    return [
      { term: { list_id: listId } },
      {
        bool: {
          minimum_should_match: 1,
          should: [
            {
              match_none: {
                _name: 'empty',
              },
            },
          ],
        },
      },
    ];
  } else if (type === 'text') {
    const should = value.reduce<unknown[]>((accum, item, index) => {
      if (Array.isArray(item)) {
        const itemFlattened = item.flat(Infinity).filter((singleValue) => singleValue != null);
        if (itemFlattened.length === 0) {
          return accum;
        } else {
          return [
            ...accum,
            ...itemFlattened.map((flatItem, secondIndex) => ({
              match: {
                [type]: { _name: `${index}.${secondIndex}`, operator: 'and', query: flatItem },
              },
            })),
          ];
        }
      } else {
        return [
          ...accum,
          { match: { [type]: { _name: `${index}.0`, operator: 'and', query: item } } },
        ];
      }
    }, []);
    return [
      { term: { list_id: listId } },
      {
        bool: {
          minimum_should_match: 1,
          should,
        },
      },
    ];
  } else {
    const should = value.reduce<unknown[]>((accum, item, index) => {
      if (Array.isArray(item)) {
        const itemFlattened = item.flat(Infinity).filter((singleValue) => singleValue != null);
        if (itemFlattened.length === 0) {
          return accum;
        } else {
          return [...accum, { terms: { _name: `${index}.0`, [type]: itemFlattened } }];
        }
      } else {
        return [...accum, { term: { [type]: { _name: `${index}.0`, value: item } } }];
      }
    }, []);
    return [
      { term: { list_id: listId } },
      {
        bool: {
          minimum_should_match: 1,
          should,
        },
      },
    ];
  }
};
