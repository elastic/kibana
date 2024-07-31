/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { parseEcsFieldPath } from './parse_ecs_field_path';
import { getAlertDetailsFieldValue } from './get_event_details_field_values';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS } from '../../../../../common/endpoint/service/response_actions/constants';

export interface EventDetailsAgentIdField {
  found: boolean;
  category: string;
  field: string;
  agentId: string;
}

/**
 * Returns the Agent ID and associated field from an alert Event Details data that should be used
 * for executing response actions
 */
export const getEventDetailsAgentIdField = (
  agentType: ResponseActionAgentType,
  eventData: TimelineEventsDetailsItem[] | null = []
): EventDetailsAgentIdField => {
  const result: EventDetailsAgentIdField = {
    found: false,
    category: '',
    field: '',
    agentId: '',
  };

  const fieldList: string[] = [...RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS[agentType]];

  fieldList.some((fieldPath) => {
    const { field, category } = parseEcsFieldPath(fieldPath);
    const agentId = getAlertDetailsFieldValue({ category, field }, eventData);

    if (agentId) {
      result.found = true;
      result.category = category;
      result.field = field;
      result.agentId = agentId;

      return true;
    }

    return false;
  });

  // ensure a `field` is always returned since we know the `agentType`. The field is sometime used
  // to show the user what might have been missing in the data that prevented it from displaying
  // response actions options.
  if (!result.found) {
    const eventDataset = getAlertDetailsFieldValue(
      { category: 'event', field: 'event.dataset' },
      eventData
    ).toLowerCase();

    // Let's try to get the event field that might be used for the given source of the alert.
    // The `event.dataset` seems to contain the same pattern as the one used to store data
    // by the integrations in the ES document - example: `sentinel_one.alert` or `sentinel_one.threat`.
    // So we'll use this to see if the field is defined for this datasource.
    if (eventDataset) {
      for (const field of fieldList) {
        if (field.toLowerCase().startsWith(eventDataset)) {
          result.field = field;
          result.category = parseEcsFieldPath(field).category;
          break;
        }
      }
    }

    // Fallback: just set it to the first field defined for the agentType
    if (!result.field) {
      result.field = fieldList[0];
      result.category = parseEcsFieldPath(result.field).category;
    }
  }

  return result;
};
