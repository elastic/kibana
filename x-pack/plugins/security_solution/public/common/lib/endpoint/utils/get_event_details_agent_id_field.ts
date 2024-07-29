/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
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
    const { field, category } = parseField(fieldPath);
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

  return result;
};

const parseField = (field: string): { category: string; field: string } => {
  const result = { category: '', field };

  if (field.includes('.')) {
    result.category = field.substring(0, field.indexOf('.'));
  }

  return result;
};
