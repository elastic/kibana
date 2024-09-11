/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ecsFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/ecs_field_map';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import { technicalRuleFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/technical_rule_field_map';
import { isEmpty } from 'lodash/fp';
import { ENRICHMENT_DESTINATION_PATH } from '../constants';

import type { Fields, TimelineEventsDetailsItem } from '../search_strategy';
import { toObjectArrayOfStrings, toStringArray } from './to_array';

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
      return toStringArray({
        lon: itemGeo.coordinates[0],
        lat: itemGeo.coordinates[1],
      });
    } catch {
      return toStringArray(item);
    }
  }
  return toStringArray(item);
};

export const isGeoField = (field: string) =>
  field.includes('geo.location') || field.includes('geoip.location');

export const isThreatEnrichmentFieldOrSubfield = (field: string, prependField?: string) =>
  prependField?.includes(ENRICHMENT_DESTINATION_PATH) || field === ENRICHMENT_DESTINATION_PATH;

export const getDataFromFieldsHits = (
  fields: Fields,
  prependField?: string,
  prependFieldCategory?: string
): TimelineEventsDetailsItem[] =>
  Object.keys(fields).reduce<TimelineEventsDetailsItem[]>((accumulator, field) => {
    const item: unknown[] = fields[field];

    const fieldCategory =
      prependFieldCategory != null ? prependFieldCategory : getFieldCategory(field);
    if (isGeoField(field)) {
      return [
        ...accumulator,
        {
          category: fieldCategory,
          field,
          values: formatGeoLocation(item),
          originalValue: formatGeoLocation(item),
          isObjectArray: true, // important for UI
        },
      ];
    }

    const objArrStr = toObjectArrayOfStrings(item);
    const strArr = objArrStr.map(({ str }) => str);
    const isObjectArray = objArrStr.some((o) => o.isObjectArray);
    const dotField = prependField ? `${prependField}.${field}` : field;

    // return simple field value (non-esc object, non-array)
    if (
      !isObjectArray ||
      Object.keys({ ...ecsFieldMap, ...technicalRuleFieldMap, ...legacyExperimentalFieldMap }).find(
        (ecsField) => ecsField === field
      ) === undefined
    ) {
      return [
        ...accumulator,
        {
          category: fieldCategory,
          field: dotField,
          values: strArr,
          originalValue: strArr,
          isObjectArray,
        },
      ];
    }

    const threatEnrichmentObject = isThreatEnrichmentFieldOrSubfield(field, prependField)
      ? [
          {
            category: fieldCategory,
            field: dotField,
            values: strArr,
            originalValue: strArr,
            isObjectArray,
          },
        ]
      : [];

    // format nested fields
    const nestedFields = Array.isArray(item)
      ? item
          .reduce<TimelineEventsDetailsItem[][]>((acc, curr) => {
            acc.push(getDataFromFieldsHits(curr as Fields, dotField, fieldCategory));
            return acc;
          }, [])
          .flat()
      : getDataFromFieldsHits(item, prependField, fieldCategory);

    // combine duplicate fields
    const flat: Record<string, TimelineEventsDetailsItem> = [
      ...accumulator,
      ...nestedFields,
      ...threatEnrichmentObject,
    ].reduce(
      (acc, f) => ({
        ...acc,
        // acc/flat is hashmap to determine if we already have the field or not without an array iteration
        // its converted back to array in return with Object.values
        ...(acc[f.field] != null
          ? {
              [f.field]: {
                ...f,
                originalValue: acc[f.field].originalValue.includes(f.originalValue[0])
                  ? acc[f.field].originalValue
                  : [...acc[f.field].originalValue, ...f.originalValue],
                values: acc[f.field].values?.includes(f.values?.[0] || '')
                  ? acc[f.field].values
                  : [...(acc[f.field].values || []), ...(f.values || [])],
              },
            }
          : { [f.field]: f }),
      }),
      {} as Record<string, TimelineEventsDetailsItem>
    );

    return Object.values(flat);
  }, []);

export const getDataSafety = <A, T>(fn: (args: A) => T, args: A): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(fn(args))));
