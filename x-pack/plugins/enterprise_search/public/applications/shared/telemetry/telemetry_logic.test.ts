/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JSON_HEADER as headers } from '../../../../common/constants';
import { LogicMounter, mockHttpValues } from '../../__mocks__';

import { TelemetryLogic } from './telemetry_logic';

describe('Telemetry logic', () => {
  const { mount, getListeners } = new LogicMounter(TelemetryLogic);
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  describe('sendTelemetry', () => {
    it('successfully calls the server-side telemetry endpoint', () => {
      TelemetryLogic.actions.sendTelemetry({
        action: 'viewed',
        metric: 'setup_guide',
        product: 'enterprise_search',
      });

      expect(http.put).toHaveBeenCalledWith('/api/enterprise_search/stats', {
        headers,
        body: '{"product":"enterprise_search","action":"viewed","metric":"setup_guide"}',
      });
    });

    it('throws an error if the telemetry endpoint fails', async () => {
      http.put.mockImplementationOnce(() => Promise.reject());
      const { sendTelemetry } = getListeners();

      await expect(sendTelemetry({ action: '', metric: '', product: '' })).rejects.toThrow(
        'Unable to send telemetry'
      );
    });
  });

  describe('product helpers', () => {
    const telemetryEvent = { action: 'viewed', metric: 'overview' };

    beforeEach(() => {
      jest.spyOn(TelemetryLogic.actions, 'sendTelemetry');
    });

    describe('sendEnterpriseSearchTelemetry', () => {
      it('calls sendTelemetry with the product populated', () => {
        TelemetryLogic.actions.sendEnterpriseSearchTelemetry(telemetryEvent);

        expect(TelemetryLogic.actions.sendTelemetry).toHaveBeenCalledWith({
          ...telemetryEvent,
          product: 'enterprise_search',
        });
      });
    });

    describe('sendAppSearchTelemetry', () => {
      it('calls sendTelemetry with the product populated', () => {
        TelemetryLogic.actions.sendAppSearchTelemetry(telemetryEvent);

        expect(TelemetryLogic.actions.sendTelemetry).toHaveBeenCalledWith({
          ...telemetryEvent,
          product: 'app_search',
        });
      });
    });

    describe('sendWorkplaceSearchTelemetry', () => {
      it('calls sendTelemetry with the product populated', () => {
        TelemetryLogic.actions.sendWorkplaceSearchTelemetry(telemetryEvent);

        expect(TelemetryLogic.actions.sendTelemetry).toHaveBeenCalledWith({
          ...telemetryEvent,
          product: 'workplace_search',
        });
      });
    });
  });
});
