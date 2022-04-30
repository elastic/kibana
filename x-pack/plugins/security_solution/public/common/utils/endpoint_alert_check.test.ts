/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { Ecs } from '../../../common/ecs';
import { generateMockDetailItemData } from '../mock';
import { isAlertFromEndpointAlert, isAlertFromEndpointEvent } from './endpoint_alert_check';

describe('isAlertFromEndpointEvent', () => {
  let mockDetailItemData: ReturnType<typeof generateMockDetailItemData>;

  beforeEach(() => {
    mockDetailItemData = generateMockDetailItemData();

    // Remove the filebeat agent type from the mock
    _.remove(mockDetailItemData, { field: 'agent.type' });

    mockDetailItemData.push(
      // Must be an Alert
      {
        field: 'kibana.alert.rule.uuid',
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
    expect(isAlertFromEndpointEvent({ data: mockDetailItemData })).toBe(true);
  });

  it('should return false if it is not an Alert (ex. maybe an event)', () => {
    _.remove(mockDetailItemData, { field: 'kibana.alert.rule.uuid' });
    expect(isAlertFromEndpointEvent({ data: mockDetailItemData })).toBeFalsy();
  });

  it('should return false if it is not an endpoint agent', () => {
    _.remove(mockDetailItemData, { field: 'agent.type' });
    expect(isAlertFromEndpointEvent({ data: mockDetailItemData })).toBeFalsy();
  });
});

describe('isAlertFromEndpointAlert', () => {
  it('should return true if detections data comes from an endpoint rule', () => {
    const mockEcsData = {
      _id: 'mockId',
      'kibana.alert.original_event.module': ['endpoint'],
      'kibana.alert.original_event.kind': ['alert'],
    } as Ecs;
    expect(isAlertFromEndpointAlert({ ecsData: mockEcsData })).toBe(true);
  });

  it('should return false if ecsData is undefined', () => {
    expect(isAlertFromEndpointAlert({ ecsData: undefined })).toBeFalsy();
  });

  it('should return false if it is not an Alert', () => {
    const mockEcsData = {
      _id: 'mockId',
      'kibana.alert.original_event.module': ['endpoint'],
    } as Ecs;
    expect(isAlertFromEndpointAlert({ ecsData: mockEcsData })).toBeFalsy();
  });

  it('should return false if it is not an endpoint module', () => {
    const mockEcsData = {
      _id: 'mockId',
      'kibana.alert.original_event.kind': ['alert'],
    } as Ecs;
    expect(isAlertFromEndpointAlert({ ecsData: mockEcsData })).toBeFalsy();
  });
});
