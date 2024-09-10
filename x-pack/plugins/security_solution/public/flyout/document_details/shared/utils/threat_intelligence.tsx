/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy, isObject } from 'lodash';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { i18n } from '@kbn/i18n';
import type { ThreatDetailsRow } from '../../left/components/threat_details_view_enrichment_accordion';
import type { CtiEnrichment, EventFields } from '../../../../../common/search_strategy';
import { isValidEventField } from '../../../../../common/search_strategy';
import { getDataFromFieldsHits } from '../../../../../common/utils/field_formatters';
import {
  DEFAULT_INDICATOR_SOURCE_PATH,
  ENRICHMENT_DESTINATION_PATH,
} from '../../../../../common/constants';
import {
  ENRICHMENT_TYPES,
  FIRST_SEEN,
  MATCHED_ATOMIC,
  MATCHED_FIELD,
  MATCHED_ID,
  MATCHED_TYPE,
  FEED_NAME,
} from '../../../../../common/cti/constants';

const NESTED_OBJECT_VALUES_NOT_RENDERED = i18n.translate(
  'xpack.securitySolution.flyout.threatIntelligence.investigationEnrichmentObjectValuesNotRendered',
  {
    defaultMessage:
      'This field contains nested object values, which are not rendered here. See the full document for all fields/values',
  }
);

/**
 *  Retrieves the first element of the given array.
 *
 * @param array the array to retrieve a value from
 * @returns the first element of the array, or undefined if the array is undefined
 */
const getFirstElement: <T = unknown>(array: T[] | undefined) => T | undefined = (array) =>
  array ? array[0] : undefined;

/**
 * Returns true if the enrichment type is 'investigation_time'
 */
export const isInvestigationTimeEnrichment = (type: string | undefined): boolean =>
  type === ENRICHMENT_TYPES.InvestigationTime;

/**
 * Parses existing enrichments from the timeline data
 */
export const parseExistingEnrichments = (
  data: TimelineEventsDetailsItem[]
): TimelineEventsDetailsItem[][] => {
  const threatIndicatorField = data.find(
    ({ field, originalValue }) => field === ENRICHMENT_DESTINATION_PATH && originalValue
  );
  if (!threatIndicatorField) {
    return [];
  }

  const { originalValue } = threatIndicatorField;
  const enrichmentStrings: string[] = Array.isArray(originalValue)
    ? originalValue
    : [originalValue];

  return enrichmentStrings.reduce<TimelineEventsDetailsItem[][]>(
    (enrichments, enrichmentString) => {
      try {
        const enrichment = getDataFromFieldsHits(JSON.parse(enrichmentString));
        enrichments.push(enrichment);
      } catch (e) {
        // omit failed parse
      }
      return enrichments;
    },
    []
  );
};

/**
 * Converts timeline data to a CtiEnrichment object
 */
export const timelineDataToEnrichment = (data: TimelineEventsDetailsItem[]): CtiEnrichment =>
  data.reduce<CtiEnrichment>((acc, item) => {
    acc[item.field] = item.originalValue;
    return acc;
  }, {});

/**
 * Extracts the first value from an enrichment field
 */
export const getEnrichmentValue = (enrichment: CtiEnrichment, field: string) =>
  getFirstElement(enrichment[field]) as string | undefined;

/**
 * These fields (e.g. 'indicator.ip') may be in one of three places depending on whether it's:
 *   * a queried, legacy filebeat indicator ('threatintel.indicator.ip')
 *   * a queried, ECS 1.11 filebeat indicator ('threat.indicator.ip')
 *   * an existing indicator from an enriched alert ('indicator.ip')
 */
export const getShimmedIndicatorValue = (enrichment: CtiEnrichment, field: string) =>
  getEnrichmentValue(enrichment, field) ||
  getEnrichmentValue(enrichment, `threatintel.${field}`) ||
  getEnrichmentValue(enrichment, `threat.${field}`);

/**
 * Extracts the identifiers from an enrichment
 */
export const getEnrichmentIdentifiers = (
  enrichment: CtiEnrichment
): {
  id: string | undefined;
  field: string | undefined;
  value: string | undefined;
  type: string | undefined;
  feedName: string | undefined;
} => ({
  id: getEnrichmentValue(enrichment, MATCHED_ID),
  field: getEnrichmentValue(enrichment, MATCHED_FIELD),
  value: getEnrichmentValue(enrichment, MATCHED_ATOMIC),
  type: getEnrichmentValue(enrichment, MATCHED_TYPE),
  feedName: getShimmedIndicatorValue(enrichment, FEED_NAME),
});

/**
 * Returns a string composed of the id and the field for the enrichment
 */
const buildEnrichmentId = (enrichment: CtiEnrichment): string => {
  const { id, field } = getEnrichmentIdentifiers(enrichment);
  return `${id}${field}`;
};

/**
 * This function receives an array of enrichments and removes
 * investigation-time enrichments if that exact indicator already exists
 * elsewhere in the list.
 *
 * @param enrichments {@type CtiEnrichment[]}
 */
export const filterDuplicateEnrichments = (enrichments: CtiEnrichment[]): CtiEnrichment[] => {
  if (enrichments.length < 2) {
    return enrichments;
  }
  const enrichmentsById = groupBy(enrichments, buildEnrichmentId);

  return Object.values(enrichmentsById).map(
    (enrichmentGroup) =>
      enrichmentGroup.find(
        (enrichment) => !isInvestigationTimeEnrichment(getEnrichmentValue(enrichment, MATCHED_TYPE))
      ) ?? enrichmentGroup[0]
  );
};

/**
 * Returns the fields from the enrichments
 */
export const getEnrichmentFields = (items: TimelineEventsDetailsItem[]): EventFields =>
  items.reduce<EventFields>((fields, item) => {
    if (isValidEventField(item.field)) {
      const value = getFirstElement(item.originalValue);
      if (value) {
        return { ...fields, [item.field]: value };
      }
    }
    return fields;
  }, {});

/**
 * Returns the first seen date from the enrichment
 */
export const getFirstSeen = (enrichment: CtiEnrichment): number => {
  const firstSeenValue = getShimmedIndicatorValue(enrichment, FIRST_SEEN);
  const firstSeenDate = Date.parse(firstSeenValue ?? 'no date');
  return Number.isInteger(firstSeenDate) ? firstSeenDate : new Date(-1).valueOf();
};

/**
 * Builds the threat details items for the summary table
 */
export const buildThreatDetailsItems = (enrichment: CtiEnrichment): ThreatDetailsRow[] =>
  Object.keys(enrichment)
    .sort()
    .map((field) => {
      const title = field.startsWith(DEFAULT_INDICATOR_SOURCE_PATH)
        ? field.replace(`${DEFAULT_INDICATOR_SOURCE_PATH}`, 'indicator')
        : field;

      let value = getFirstElement(enrichment[field]);
      if (isObject(value)) {
        value = NESTED_OBJECT_VALUES_NOT_RENDERED;
      }

      return { title, description: { fieldName: field, value: value as string } };
    });
