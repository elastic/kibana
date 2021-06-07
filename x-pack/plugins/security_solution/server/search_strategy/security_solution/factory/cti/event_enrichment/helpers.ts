/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash';
import { Hit, QueryContainer, TotalHits } from '@elastic/elasticsearch/api/types';

import { EVENT_ENRICHMENT_INDICATOR_FIELD_MAP } from '../../../../../../common/cti/constants';
import { CtiEnrichment } from '../../../../../../common/search_strategy/security_solution/cti';

type EventField = keyof typeof EVENT_ENRICHMENT_INDICATOR_FIELD_MAP;
const validEventFields = Object.keys(EVENT_ENRICHMENT_INDICATOR_FIELD_MAP) as EventField[];

const isValidEventField = (field: string): field is EventField =>
  validEventFields.includes(field as EventField);

export const buildIndicatorShouldClauses = (
  eventFields: Record<string, unknown>
): QueryContainer[] => {
  return validEventFields.reduce<QueryContainer[]>((shoulds, eventField) => {
    const eventFieldValue = eventFields[eventField];

    if (!isEmpty(eventFieldValue)) {
      shoulds.push({
        match: {
          [EVENT_ENRICHMENT_INDICATOR_FIELD_MAP[eventField]]: {
            query: eventFieldValue,
            _name: eventField,
          },
        },
      });
    }

    return shoulds;
  }, []);
};

export const buildIndicatorEnrichments = (hits: Hit[]): CtiEnrichment[] => {
  return hits.flatMap<CtiEnrichment>(({ matched_queries: matchedQueries, ...hit }) => {
    return (
      matchedQueries?.reduce<CtiEnrichment[]>((enrichments, matchedQuery) => {
        if (isValidEventField(matchedQuery)) {
          enrichments.push({
            ...hit.fields,
            ...buildIndicatorMatchedFields(hit, matchedQuery),
          });
        }

        return enrichments;
      }, []) ?? []
    );
  });
};

const buildIndicatorMatchedFields = (
  hit: Hit,
  eventField: EventField
): Record<string, unknown[]> => {
  const indicatorField = EVENT_ENRICHMENT_INDICATOR_FIELD_MAP[eventField];
  const atomic = get(hit.fields, indicatorField) as string[];

  return {
    'matched.atomic': atomic,
    'matched.field': [eventField],
    'matched.id': [hit._id],
    'matched.index': [hit._index],
  };
};

export const getTotalCount = (total: number | TotalHits | null): number => {
  if (total == null) {
    return 0;
  }

  if (typeof total === 'number') {
    return total;
  }

  return total.value;
};
