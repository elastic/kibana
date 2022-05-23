/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import { ENRICHMENT_DESTINATION_PATH } from '../../../../../common/constants';
import {
  ENRICHMENT_TYPES,
  FIRST_SEEN,
  MATCHED_ATOMIC,
  MATCHED_FIELD,
  MATCHED_ID,
  MATCHED_TYPE,
  FEED_NAME,
} from '../../../../../common/cti/constants';
import { TimelineEventsDetailsItem } from '../../../../../common/search_strategy';
import {
  CtiEnrichment,
  CtiEnrichmentIdentifiers,
  EventFields,
  isValidEventField,
} from '../../../../../common/search_strategy/security_solution/cti';
import { getFirstElement } from '../../../../../common/utils/data_retrieval';
import { getDataFromSourceHits } from '../../../../../common/utils/field_formatters';

export const isInvestigationTimeEnrichment = (type: string | undefined) =>
  type === ENRICHMENT_TYPES.InvestigationTime;

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
  const enrichmentStrings = Array.isArray(originalValue) ? originalValue : [originalValue];

  return enrichmentStrings.reduce<TimelineEventsDetailsItem[][]>(
    (enrichments, enrichmentString) => {
      try {
        const enrichment = getDataFromSourceHits(JSON.parse(enrichmentString));
        enrichments.push(enrichment);
      } catch (e) {
        // omit failed parse
      }
      return enrichments;
    },
    []
  );
};

export const timelineDataToEnrichment = (data: TimelineEventsDetailsItem[]): CtiEnrichment =>
  data.reduce<CtiEnrichment>((acc, item) => {
    acc[item.field] = item.originalValue;
    return acc;
  }, {});

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

export const getEnrichmentIdentifiers = (enrichment: CtiEnrichment): CtiEnrichmentIdentifiers => ({
  id: getEnrichmentValue(enrichment, MATCHED_ID),
  field: getEnrichmentValue(enrichment, MATCHED_FIELD),
  value: getEnrichmentValue(enrichment, MATCHED_ATOMIC),
  type: getEnrichmentValue(enrichment, MATCHED_TYPE),
  feedName: getShimmedIndicatorValue(enrichment, FEED_NAME),
});

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

export const getFirstSeen = (enrichment: CtiEnrichment): number => {
  const firstSeenValue = getShimmedIndicatorValue(enrichment, FIRST_SEEN);
  const firstSeenDate = Date.parse(firstSeenValue ?? 'no date');
  return Number.isInteger(firstSeenDate) ? firstSeenDate : new Date(-1).valueOf();
};

export interface ThreatDetailsRow {
  title: string;
  description: {
    fieldName: string;
    value: string;
  };
}
