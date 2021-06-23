/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { mockDetailItemData } from '../mock';
import { endpointAlertCheck } from './endpoint_alert_check';

describe('utils', () => {
  describe('endpointAlertCheck', () => {
    it('should return false if detections data does not come from endpoint rule', () => {
      expect(endpointAlertCheck({ data: mockDetailItemData })).toBeFalsy();
    });
    it('should return true if detections data comes from an endpoint rule', () => {
      _.remove(mockDetailItemData, function (o) {
        return o.field === 'agent.type';
      });
      const mockEndpointDetailItemData = _.concat(mockDetailItemData, {
        field: 'agent.type',
        originalValue: 'endpoint',
        values: ['endpoint'],
        isObjectArray: false,
      });

      expect(endpointAlertCheck({ data: mockEndpointDetailItemData })).toBeTruthy();
    });
  });
});
