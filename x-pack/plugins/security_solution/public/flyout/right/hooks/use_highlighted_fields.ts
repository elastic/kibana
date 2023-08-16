/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { find, isEmpty } from 'lodash/fp';
import { ALERT_RULE_TYPE } from '@kbn/rule-data-utils';
import { isAlertFromEndpointEvent } from '../../../common/utils/endpoint_alert_check';
import {
  getEventCategoriesFromData,
  getEventFieldsToDisplay,
} from '../../../common/components/event_details/get_alert_summary_rows';

export interface UseHighlightedFieldsParams {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * An array of fields user has selected to highlight, defined on rule
   */
  investigationFields?: string[];
}

export interface UseHighlightedFieldsResult {
  /**
   * Highlighted field name (label or if null, falls back to id)
   */
  field: string;
  description: {
    /**
     * Highlighted field name (overrideField or if null, falls back to id)
     */
    field: string;
    /**
     * Highlighted field value
     */
    values: string[] | null | undefined;
  };
}

/**
 * Returns the highlighted fields to display in the right panel under the Investigation section.
 */
export const useHighlightedFields = ({
  dataFormattedForFieldBrowser,
  investigationFields,
}: UseHighlightedFieldsParams): UseHighlightedFieldsResult[] => {
  if (!dataFormattedForFieldBrowser) return [];

  const eventCategories = getEventCategoriesFromData(dataFormattedForFieldBrowser);

  const eventCodeField = find(
    { category: 'event', field: 'event.code' },
    dataFormattedForFieldBrowser
  );

  const eventCode = Array.isArray(eventCodeField?.originalValue)
    ? eventCodeField?.originalValue?.[0]
    : eventCodeField?.originalValue;

  const eventRuleTypeField = find(
    { category: 'kibana', field: ALERT_RULE_TYPE },
    dataFormattedForFieldBrowser
  );

  const eventRuleType = Array.isArray(eventRuleTypeField?.originalValue)
    ? eventRuleTypeField?.originalValue?.[0]
    : eventRuleTypeField?.originalValue;

  const tableFields = getEventFieldsToDisplay({
    eventCategories,
    eventCode,
    eventRuleType,
    highlightedFieldsOverride: investigationFields ?? [],
  });

  return tableFields.reduce<UseHighlightedFieldsResult[]>((acc, field) => {
    const item = dataFormattedForFieldBrowser.find(
      (data) => data.field === field.id || (field.legacyId && data.field === field.legacyId)
    );
    if (!item || isEmpty(item.values)) {
      return acc;
    }

    // If we found the data by its legacy id we swap the ids to display the correct one
    if (item.field === field.legacyId) {
      field.id = field.legacyId;
    }

    if (
      field.id === 'agent.id' &&
      !isAlertFromEndpointEvent({ data: dataFormattedForFieldBrowser })
    ) {
      return acc;
    }

    return [
      ...acc,
      {
        field: field.label ?? field.id,
        description: {
          field: field.overrideField ?? field.id,
          values: item.values,
        },
      },
    ];
  }, []);
};
