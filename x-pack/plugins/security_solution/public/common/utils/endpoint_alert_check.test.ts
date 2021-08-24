/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import _ from 'lodash';
import { generateMockDetailItemData } from '../mock';
import { endpointAlertCheck } from './endpoint_alert_check';

describe('Endpoint Alert Check Utility', () => {
  let mockDetailItemData: ReturnType<typeof generateMockDetailItemData>;

  beforeEach(() => {
    mockDetailItemData = generateMockDetailItemData();

    // Remove the filebeat agent type from the mock
    _.remove(mockDetailItemData, { field: 'agent.type' });

    mockDetailItemData.push(
      // Must be an Alert
      {
        field: ALERT_RULE_UUID,
        category: 'kibana',
        originalValue: 'endpoint',
        values: ['endpoint'],
        isObjectArray: false,
      },
      // Must be from an endpoint agent
      {
        field: 'agent.type',
        originalValue: 'endpoint',
        values: ['endpoint'],
        isObjectArray: false,
      }
    );
  });

  it('should return true if detections data comes from an endpoint rule', () => {
    expect(endpointAlertCheck({ data: mockDetailItemData })).toBe(true);
  });

  it('should return false if it is not an Alert (ex. maybe an event)', () => {
    _.remove(mockDetailItemData, { field: ALERT_RULE_UUID });
    expect(endpointAlertCheck({ data: mockDetailItemData })).toBeFalsy();
  });

  it('should return false if it is not an endpoint agent', () => {
    _.remove(mockDetailItemData, { field: 'agent.type' });
    expect(endpointAlertCheck({ data: mockDetailItemData })).toBeFalsy();
  });
});
