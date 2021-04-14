/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { INDICATOR_DESTINATION_PATH } from '../../../common/constants';
import { TimelineEventsDetailsItem } from '../../../common/search_strategy';
import { getDataFromSourceHits } from '../../../common/utils/field_formatters';
import { ThreatDetailsRow, ThreatSummaryRow } from '../components/event_details/helpers';
import { EventsViewType } from '../components/event_details/event_details';

const sortedThreatSummaryFields = [
  'matched.field',
  'matched.type',
  'provider',
  'first_seen',
  'last_seen',
];

export const useThreatIntel = (
  data: TimelineEventsDetailsItem[] = [],
  isAlert: boolean,
  eventId: string,
  contextId: string,
  selectedTabId: EventsViewType
) => {
  const threatData: TimelineEventsDetailsItem[][] = useMemo(() => {
    if (isAlert && data) {
      const threatIndicator = data.find(
        ({ field, originalValue }) => field === INDICATOR_DESTINATION_PATH && originalValue
      );
      if (!threatIndicator) return [];
      const { originalValue } = threatIndicator;
      const values = Array.isArray(originalValue) ? originalValue : [originalValue];
      return values.reduce((acc, value) => {
        const item = getDataFromSourceHits(JSON.parse(value));
        if (item.length > 0) acc.push(item);
        return acc;
      }, []);
    }
    return [[]];
  }, [isAlert, data]);

  const threatSummaryRows = useMemo(() => {
    const rows: ThreatSummaryRow[] = [];
    if (selectedTabId !== EventsViewType.summaryView) return rows;
    return threatData
      .reduce((acc, items) => {
        items.forEach(({ field, originalValue }) => {
          const index = sortedThreatSummaryFields.indexOf(field);
          if (index > -1) {
            const newValues = Array.isArray(originalValue) ? originalValue : [originalValue];
            const existingItem = acc[index];
            acc[index] = existingItem
              ? {
                  ...existingItem,
                  description: {
                    ...existingItem.description,
                    values: [...existingItem.description.values, ...newValues].filter(
                      (value, i, arr) => arr.indexOf(value) === i
                    ),
                  },
                }
              : {
                  title: field,
                  description: {
                    values: newValues,
                    contextId,
                    eventId,
                    fieldName: `${INDICATOR_DESTINATION_PATH}.${field}`,
                  },
                  index,
                };
          }
        });
        return acc;
      }, rows)
      .filter((item) => !!item);
  }, [threatData, eventId, contextId, selectedTabId]);

  const threatDetailsRows: ThreatDetailsRow[][] = useMemo(
    () =>
      selectedTabId === EventsViewType.threatIntelView
        ? threatData.map((items) =>
            items.map((threatInfoItem) => ({
              title: threatInfoItem.field,
              description: {
                fieldName: `${INDICATOR_DESTINATION_PATH}.${threatInfoItem.field}`,
                value: threatInfoItem.originalValue,
              },
            }))
          )
        : [[]],
    [threatData, selectedTabId]
  );

  return {
    isThreatPresent: threatData.length > 0,
    threatCount: threatData.length,
    threatSummaryRows,
    threatDetailsRows,
  };
};
