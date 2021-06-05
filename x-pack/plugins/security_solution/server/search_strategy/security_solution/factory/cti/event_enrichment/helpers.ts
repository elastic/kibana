/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { QueryContainer } from '@elastic/elasticsearch/api/types';

import { EVENT_ENRICHMENT_INDICATOR_FIELD_MAP } from '../../../../../../common/cti/constants';

export const buildIndicatorShouldClauses = (
  eventFields: Record<string, unknown>
): QueryContainer[] => {
  const validEventFields = Object.keys(EVENT_ENRICHMENT_INDICATOR_FIELD_MAP) as Array<
    keyof typeof EVENT_ENRICHMENT_INDICATOR_FIELD_MAP
  >;

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
