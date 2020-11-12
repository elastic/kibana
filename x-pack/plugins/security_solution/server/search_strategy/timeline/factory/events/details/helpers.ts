/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';

import { TimelineEventsDetailsItem } from '../../../../../../common/search_strategy/timeline';
import { toStringArray } from '../../../../helpers/to_array';

export const baseCategoryFields = ['@timestamp', 'labels', 'message', 'tags'];

export const getFieldCategory = (field: string): string => {
  const fieldCategory = field.split('.')[0];
  if (!isEmpty(fieldCategory) && baseCategoryFields.includes(fieldCategory)) {
    return 'base';
  }
  return fieldCategory;
};

export const getDataFromHits = (fields: Record<string, unknown[]>): TimelineEventsDetailsItem[] =>
  Object.keys(fields).reduce<TimelineEventsDetailsItem[]>((accumulator, field) => {
    const item: unknown[] = fields[field];
    const fieldCategory = getFieldCategory(field);
    return [
      ...accumulator,
      {
        category: fieldCategory,
        field,
        values: toStringArray(item),
        originalValue: item,
      } as TimelineEventsDetailsItem,
    ];
  }, []);
