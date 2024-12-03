/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/server/mocks';
import { inventoryTelemetryEventBasedTypes } from './telemetry_events';

import { TelemetryService } from './telemetry_service';
import {
  type EntityInventoryViewedParams,
  type EntityViewClickedParams,
  type EntityInventorySearchQuerySubmittedParams,
  TelemetryEventTypes,
  EntityInventoryEntityTypeFilteredParams,
} from './types';

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

      const expectedProperties = [
        'reportInventoryAddData',
        'reportEntityInventoryViewed',
        'reportEntityInventorySearchQuerySubmitted',
        'reportEntityViewClicked',
      ];
      expectedProperties.forEach((property) => {
        expect(telemetry).toHaveProperty(property);
      });
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

  describe('#reportEntityInventoryViewed', () => {
    it('should report entity inventory viewed with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();
      const params: EntityInventoryViewedParams = {
        view_state: 'empty',
      };

      telemetry.reportEntityInventoryViewed(params);

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        TelemetryEventTypes.ENTITY_INVENTORY_VIEWED,
        params
      );
    });
  });

  describe('#reportEntityInventorySearchQuerySubmitted', () => {
    it('should report search query submitted with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();
      const params: EntityInventorySearchQuerySubmittedParams = {
        kuery_fields: ['_index'],
        action: 'submit',
      };

      telemetry.reportEntityInventorySearchQuerySubmitted(params);

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        TelemetryEventTypes.ENTITY_INVENTORY_SEARCH_QUERY_SUBMITTED,
        params
      );
    });
  });

  describe('#reportEntityViewClicked', () => {
    it('should report entity view clicked with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();
      const params: EntityViewClickedParams = {
        entity_type: 'container',
        view_type: 'detail',
      };

      telemetry.reportEntityViewClicked(params);

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        TelemetryEventTypes.ENTITY_VIEW_CLICKED,
        params
      );
    });
  });

  describe('#reportEntityInventoryEntityTypeFiltered', () => {
    it('should report entity type filtered with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();
      const params: EntityInventoryEntityTypeFilteredParams = {
        include_entity_types: ['container'],
        exclude_entity_types: ['service'],
      };

      telemetry.reportEntityInventoryEntityTypeFiltered(params);

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        TelemetryEventTypes.ENTITY_INVENTORY_ENTITY_TYPE_FILTERED,
        params
      );
    });
  });
});
