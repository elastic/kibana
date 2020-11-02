/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

import { JSON_HEADER as headers } from '../../../../common/constants';
import { mockHttpValues } from '../../__mocks__';
jest.mock('../http', () => ({
  HttpLogic: { values: { http: mockHttpValues.http } },
}));

import { TelemetryLogic } from './';

describe('Telemetry logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetContext({});
    TelemetryLogic.mount();
  });

  describe('sendTelemetry', () => {
    it('successfully calls the server-side telemetry endpoint', () => {
      TelemetryLogic.actions.sendTelemetry({
        action: 'viewed',
        metric: 'setup_guide',
        product: 'enterprise_search',
      });

      expect(mockHttpValues.http.put).toHaveBeenCalledWith('/api/enterprise_search/stats', {
        headers,
        body: '{"product":"enterprise_search","action":"viewed","metric":"setup_guide"}',
      });
    });

    it('throws an error if the telemetry endpoint fails', async () => {
      mockHttpValues.http.put.mockImplementationOnce(() => Promise.reject());

      // To capture thrown errors, we have to call the listener fn directly
      // instead of using `TelemetryLogic.actions.sendTelemetry` - this is
      // due to how Kea invokes/wraps action fns by design.
      const { sendTelemetry } = (TelemetryLogic.inputs[0] as any).listeners({ actions: {} });

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
