/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  ENRICHMENT_TYPES,
  EVENT_ENRICHMENT_INDICATOR_FIELD_MAP,
} from '../../../../../../common/cti/constants';
import {
  CtiEnrichment,
  EventField,
  isValidEventField,
  validEventFields,
} from '../../../../../../common/search_strategy/security_solution/cti';

export const buildIndicatorShouldClauses = (
  eventFields: Record<string, unknown>
): estypes.QueryDslQueryContainer[] => {
  return validEventFields.reduce<estypes.QueryDslQueryContainer[]>((shoulds, eventField) => {
    const eventFieldValue = eventFields[eventField];

    if (!isEmpty(eventFieldValue)) {
      shoulds.push({
        // @ts-expect-error unknown is not assignable to query
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

export const buildIndicatorEnrichments = (hits: estypes.SearchHit[]): CtiEnrichment[] => {
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
  hit: estypes.SearchHit,
  eventField: EventField
): Record<string, unknown[]> => {
  const indicatorField = EVENT_ENRICHMENT_INDICATOR_FIELD_MAP[eventField];
  const atomic = get(hit.fields, indicatorField) as string[];

  return {
    'matched.atomic': atomic,
    'matched.field': [eventField],
    'matched.id': [hit._id],
    'matched.index': [hit._index],
    'matched.type': [ENRICHMENT_TYPES.InvestigationTime],
  };
};

export const getTotalCount = (
  total: number | estypes.SearchTotalHits | null | undefined
): number => {
  if (total == null) {
    return 0;
  }

  if (typeof total === 'number') {
    return total;
  }

  return total.value;
};
