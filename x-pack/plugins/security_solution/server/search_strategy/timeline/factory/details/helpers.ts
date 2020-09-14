/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isEmpty, isNumber, isObject, isString } from 'lodash/fp';

import { DetailItem } from '../../../../../common/search_strategy/timeline';
import { baseCategoryFields } from '../../../../utils/beat_schema/8.0.0';

export const getFieldCategory = (field: string): string => {
  const fieldCategory = field.split('.')[0];
  if (!isEmpty(fieldCategory) && baseCategoryFields.includes(fieldCategory)) {
    return 'base';
  }
  return fieldCategory;
};

export const getDataFromHits = (
  sources: EventSource,
  category?: string,
  path?: string
): DetailItem[] =>
  Object.keys(sources).reduce<DetailItem[]>((accumulator, source) => {
    const item: EventSource = get(source, sources);
    if (Array.isArray(item) || isString(item) || isNumber(item)) {
      const field = path ? `${path}.${source}` : source;
      const fieldCategory = getFieldCategory(field);

      return [
        ...accumulator,
        {
          category: fieldCategory,
          field,
          values: Array.isArray(item)
            ? item.map((value) => {
                if (isObject(value)) {
                  return JSON.stringify(value);
                }

                return value;
              })
            : [item],
          originalValue: item,
        } as DetailItem,
      ];
    } else if (isObject(item)) {
      return [
        ...accumulator,
        ...getDataFromHits(item, category || source, path ? `${path}.${source}` : source),
      ];
    }
    return accumulator;
  }, []);
