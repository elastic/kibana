/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD } from '../../../../common/endpoint/service/response_actions/constants';

/** @private */
const generateEndpointAlertDetailsItemDataMock = (): TimelineEventsDetailsItem[] => {
  return [
    {
      category: 'kibana',
      field: 'kibana.alert.rule.uuid',
      values: ['b69d086c-325a-4f46-b17b-fb6d227006ba'],
      originalValue: ['b69d086c-325a-4f46-b17b-fb6d227006ba'],
      isObjectArray: false,
    },
    {
      category: 'agent',
      field: 'agent.type',
      values: ['endpoint'],
      originalValue: ['endpoint'],
      isObjectArray: false,
    },
    {
      category: 'agent',
      field: 'agent.id',
      values: ['abfe4a35-d5b4-42a0-a539-bd054c791769'],
      originalValue: ['abfe4a35-d5b4-42a0-a539-bd054c791769'],
      isObjectArray: false,
    },
    {
      category: 'event',
      field: 'event.module',
      values: ['endpoint'],
      originalValue: ['endpoint'],
      isObjectArray: false,
    },
    {
      category: 'host',
      field: 'host.name',
      values: ['elastic-host-win'],
      originalValue: ['windows-native'],
      isObjectArray: false,
    },
    {
      category: 'host',
      field: 'host.os.family',
      values: ['windows'],
      originalValue: ['windows'],
      isObjectArray: false,
    },
  ];
};

/** @private */
const generateSentinelOneAlertDetailsItemDataMock = (): TimelineEventsDetailsItem[] => {
  const data = generateEndpointAlertDetailsItemDataMock();

  data.forEach((itemData) => {
    switch (itemData.field) {
      case 'event.module':
        itemData.values = ['sentinel_one'];
        itemData.originalValue = ['sentinel_one'];
        break;

      case 'agent.type':
        itemData.values = ['filebeat'];
        itemData.originalValue = ['filebeat'];
        break;
    }
  });

  data.push({
    category: 'observer',
    field: RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.sentinel_one,
    values: ['abfe4a35-d5b4-42a0-a539-bd054c791769'],
    originalValue: ['abfe4a35-d5b4-42a0-a539-bd054c791769'],
    isObjectArray: false,
  });

  return data;
};

/** @private */
const generateCrowdStrikeAlertDetailsItemDataMock = (): TimelineEventsDetailsItem[] => {
  const data = generateEndpointAlertDetailsItemDataMock();

  data.forEach((itemData) => {
    switch (itemData.field) {
      case 'event.module':
        itemData.values = ['crowdstrike'];
        itemData.originalValue = ['crowdstrike'];
        break;

      case 'agent.type':
        itemData.values = ['filebeat'];
        itemData.originalValue = ['filebeat'];
        break;
    }
  });

  data.push({
    category: 'crowdstrike',
    field: RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.crowdstrike,
    values: ['abfe4a35-d5b4-42a0-a539-bd054c791769'],
    originalValue: ['abfe4a35-d5b4-42a0-a539-bd054c791769'],
    isObjectArray: false,
  });

  return data;
};

const generateAlertDetailsItemDataForAgentTypeMock = (
  agentType: ResponseActionAgentType
): TimelineEventsDetailsItem[] => {
  switch (agentType) {
    case 'endpoint':
      return generateEndpointAlertDetailsItemDataMock();
    case 'sentinel_one':
      return generateSentinelOneAlertDetailsItemDataMock();
    case 'crowdstrike':
      return generateCrowdStrikeAlertDetailsItemDataMock();
  }
};

export const endpointAlertDataMock = Object.freeze({
  generateEndpointAlertDetailsItemData: generateEndpointAlertDetailsItemDataMock,
  generateSentinelOneAlertDetailsItemData: generateSentinelOneAlertDetailsItemDataMock,
  generateCrowdStrikeAlertDetailsItemData: generateCrowdStrikeAlertDetailsItemDataMock,
  generateAlertDetailsItemDataForAgentType: generateAlertDetailsItemDataForAgentTypeMock,
});
