/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isEmpty, isNumber, isObject, isString } from 'lodash/fp';

import { EventSource, TimelineEventsDetailsItem } from '../../../../../../common/search_strategy';
import { toStringArray } from '../../../../helpers/to_array';

export const baseCategoryFields = ['@timestamp', 'labels', 'message', 'tags'];

export const getFieldCategory = (field: string): string => {
  const fieldCategory = field.split('.')[0];
  if (!isEmpty(fieldCategory) && baseCategoryFields.includes(fieldCategory)) {
    return 'base';
  }
  return fieldCategory;
};

export const formatGeoLocation = (item: unknown[]) => {
  const itemGeo = item.length > 0 ? (item[0] as { coordinates: number[] }) : null;
  if (itemGeo != null && !isEmpty(itemGeo.coordinates)) {
    try {
      return toStringArray({ long: itemGeo.coordinates[0], lat: itemGeo.coordinates[1] });
    } catch {
      return toStringArray(item);
    }
  }
  return toStringArray(item);
};

export const isGeoField = (field: string) =>
  field.includes('geo.location') || field.includes('geoip.location');

export const getDataFromSourceHits = (
  sources: EventSource,
  category?: string,
  path?: string
): TimelineEventsDetailsItem[] =>
  Object.keys(sources).reduce<TimelineEventsDetailsItem[]>((accumulator, source) => {
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
        } as TimelineEventsDetailsItem,
      ];
    } else if (isObject(item)) {
      return [
        ...accumulator,
        ...getDataFromSourceHits(item, category || source, path ? `${path}.${source}` : source),
      ];
    }
    return accumulator;
  }, []);

export const getDataFromFieldsHits = (
  fields: Record<string, unknown[]>
): TimelineEventsDetailsItem[] =>
  Object.keys(fields).reduce<TimelineEventsDetailsItem[]>((accumulator, field) => {
    const item: unknown[] = fields[field];
    const fieldCategory = getFieldCategory(field);
    return [
      ...accumulator,
      {
        category: fieldCategory,
        field,
        values: isGeoField(field) ? formatGeoLocation(item) : toStringArray(item),
        originalValue: toStringArray(item),
      } as TimelineEventsDetailsItem,
    ];
  }, []);
