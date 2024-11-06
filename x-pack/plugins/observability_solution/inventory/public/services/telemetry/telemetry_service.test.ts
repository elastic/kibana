/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/server/mocks';
import { inventoryTelemetryEventBasedTypes } from './telemetry_events';

import { TelemetryService } from './telemetry_service';
import { TelemetryEventTypes } from './types';

describe('TelemetryService', () => {
  let service: TelemetryService;

  beforeEach(() => {
    service = new TelemetryService();
  });

  const getSetupParams = () => {
    const mockCoreStart = coreMock.createSetup();
    return {
      analytics: mockCoreStart.analytics,
    };
  };

  describe('#setup()', () => {
    it('should register all the custom events', () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);

      expect(setupParams.analytics.registerEventType).toHaveBeenCalledTimes(
        inventoryTelemetryEventBasedTypes.length
      );

      inventoryTelemetryEventBasedTypes.forEach((eventConfig, pos) => {
        expect(setupParams.analytics.registerEventType).toHaveBeenNthCalledWith(
          pos + 1,
          eventConfig
        );
      });
    });
  });

  describe('#start()', () => {
    it('should return all the available tracking methods', () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      expect(telemetry).toHaveProperty('reportInventoryAddData');
    });
  });

  describe('#reportInventoryAddData', () => {
    it('should report inventory add data clicked with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportInventoryAddData({
        view: 'add_data_button',
        journey: 'add_data',
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        TelemetryEventTypes.INVENTORY_ADD_DATA_CLICKED,
        {
          view: 'add_data_button',
          journey: 'add_data',
        }
      );
    });
  });
});
