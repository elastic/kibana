/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { endpointAlertCheck } from './endpoint_alert_check';

describe('utils', () => {
  describe('endpoinAlertCheck', () => {
    it('should return true if detections data comes from an endpoint rule', () => {
      expect(endpointAlertCheck(mockData)).toBeTruthy();
    });
    it('should return false if detections data does not come from endpoint rule', () => {
      expect(endpointAlertCheck(mockDataWithout)).toBeFalsy();
    });
  });
});
