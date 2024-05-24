/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { find, isEmpty } from 'lodash/fp';
import { ALERT_RULE_TYPE } from '@kbn/rule-data-utils';
import {
  CROWDSTRIKE_AGENT_ID_FIELD,
  isAlertFromCrowdstrikeEvent,
} from '../../../../common/utils/crowdstrike_alert_check';
import {
  SENTINEL_ONE_AGENT_ID_FIELD,
  isAlertFromSentinelOneEvent,
} from '../../../../common/utils/sentinelone_alert_check';
import { isAlertFromEndpointEvent } from '../../../../common/utils/endpoint_alert_check';
import {
  getEventCategoriesFromData,
  getEventFieldsToDisplay,
} from '../../../../common/components/event_details/get_alert_summary_rows';

export interface UseHighlightedFieldsParams {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * An array of fields user has selected to highlight, defined on rule
   */
  investigationFields?: string[];
}

export interface UseHighlightedFieldsResult {
  [fieldName: string]: {
    /**
     * If the field has a custom override
     */
    overrideField?: { field: string; values: string[] };
    /**
     * Values for the field
     */
    values: string[];
  };
}

/**
 * Returns the highlighted fields to display in the right panel under the Investigation section.
 */
export const useHighlightedFields = ({
  dataFormattedForFieldBrowser,
  investigationFields,
}: UseHighlightedFieldsParams): UseHighlightedFieldsResult => {
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

  return tableFields.reduce<UseHighlightedFieldsResult>((acc, field) => {
    const item = dataFormattedForFieldBrowser.find(
      (data) => data.field === field.id || (field.legacyId && data.field === field.legacyId)
    );
    if (!item) {
      return acc;
    }

    // if there aren't any values we can skip this highlighted field
    const fieldValues = item.values;
    if (!fieldValues || isEmpty(fieldValues)) {
      return acc;
    }

    // if we found the data by its legacy id we swap the ids to display the correct one
    if (item.field === field.legacyId) {
      field.id = field.legacyId;
    }

    // if the field is agent.id and the event is not an endpoint event we skip it
    if (
      field.id === 'agent.id' &&
      !isAlertFromEndpointEvent({ data: dataFormattedForFieldBrowser })
    ) {
      return acc;
    }

    // if the field is observer.serial_number and the event is not a sentinel one event we skip it
    if (
      field.id === SENTINEL_ONE_AGENT_ID_FIELD &&
      !isAlertFromSentinelOneEvent({ data: dataFormattedForFieldBrowser })
    ) {
      return acc;
    }

    // if the field is crowdstrike.event.DeviceId and the event is not a crowdstrike event we skip it
    if (
      field.id === CROWDSTRIKE_AGENT_ID_FIELD &&
      !isAlertFromCrowdstrikeEvent({ data: dataFormattedForFieldBrowser })
    ) {
      return acc;
    }

    return {
      ...acc,
      [field.id]: {
        ...(field.overrideField && {
          overrideField: {
            field: field.overrideField,
            values:
              find({ field: field.overrideField }, dataFormattedForFieldBrowser)?.values ?? [],
          },
        }),
        values: fieldValues,
      },
    };
  }, {});
};
