/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INDICATOR_DESTINATION_PATH } from '../../../../../common/constants';
import { TimelineEventsDetailsItem } from '../../../../../common/search_strategy';
import { getDataFromSourceHits } from '../../../../../common/utils/field_formatters';

const isEventDetailsItem = (
  item: TimelineEventsDetailsItem[] | null
): item is TimelineEventsDetailsItem[] => !!item;

export const parseExistingEnrichments = (
  data: TimelineEventsDetailsItem[]
): TimelineEventsDetailsItem[][] => {
  const threatIndicatorField = data.find(
    ({ field, originalValue }) => field === INDICATOR_DESTINATION_PATH && originalValue
  );
  if (!threatIndicatorField) {
    return [];
  }

  const { originalValue } = threatIndicatorField;
  const enrichmentStrings = Array.isArray(originalValue) ? originalValue : [originalValue];

  return enrichmentStrings
    .map((enrichmentString) => {
      try {
        const enrichment = JSON.parse(enrichmentString);
        return getDataFromSourceHits(enrichment);
      } catch (e) {
        return null;
      }
    })
    .filter(isEventDetailsItem);
};
