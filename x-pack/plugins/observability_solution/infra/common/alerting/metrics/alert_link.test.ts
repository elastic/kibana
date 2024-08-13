/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common/parse_technical_fields';
import { ALERT_RULE_PARAMETERS, TIMESTAMP } from '@kbn/rule-data-utils';
import rison from '@kbn/rison';
import {
  getInventoryViewInAppUrl,
  flatAlertRuleParams,
  getMetricsViewInAppUrl,
} from './alert_link';
import {
  InventoryLocator,
  AssetDetailsLocator,
  InventoryLocatorParams,
  AssetDetailsLocatorParams,
} from '@kbn/observability-shared-plugin/common';

jest.mock('@kbn/observability-shared-plugin/common');

const mockInventoryLocator = {
  getRedirectUrl: jest
    .fn()
    .mockImplementation(
      (params: InventoryLocatorParams) => `/inventory?${rison.encodeUnknown(params)}`
    ),
} as unknown as jest.Mocked<InventoryLocator>;

const mockAssetDetailsLocator = {
  getRedirectUrl: jest
    .fn()
    .mockImplementation(
      ({ assetId, assetType, assetDetails }: AssetDetailsLocatorParams) =>
        `/node/${assetType}/${assetId}?${rison.encodeUnknown(assetDetails)}`
    ),
} as unknown as jest.Mocked<AssetDetailsLocator>;

describe('Inventory Threshold Rule', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('flatAlertRuleParams', () => {
    it('flat ALERT_RULE_PARAMETERS', () => {
      expect(
        flatAlertRuleParams(
          {
            sourceId: 'default',
            criteria: [
              {
                comparator: '>',
                timeSize: 1,
                metric: 'cpu',
                threshold: [5],
                customMetric: {
                  field: '',
                  aggregation: 'avg',
                  id: 'alert-custom-metric',
                  type: 'custom',
                },
                timeUnit: 'm',
              },
            ],
            nodeType: 'host',
          },
          ALERT_RULE_PARAMETERS
        )
      ).toMatchInlineSnapshot(`
        Object {
          "kibana.alert.rule.parameters.criteria.comparator": Array [
            ">",
          ],
          "kibana.alert.rule.parameters.criteria.customMetric.aggregation": Array [
            "avg",
          ],
          "kibana.alert.rule.parameters.criteria.customMetric.field": Array [
            "",
          ],
          "kibana.alert.rule.parameters.criteria.customMetric.id": Array [
            "alert-custom-metric",
          ],
          "kibana.alert.rule.parameters.criteria.customMetric.type": Array [
            "custom",
          ],
          "kibana.alert.rule.parameters.criteria.metric": Array [
            "cpu",
          ],
          "kibana.alert.rule.parameters.criteria.timeSize": Array [
            1,
          ],
          "kibana.alert.rule.parameters.criteria.timeUnit": Array [
            "m",
          ],
          "kibana.alert.rule.parameters.nodeType": Array [
            "host",
          ],
          "kibana.alert.rule.parameters.sourceId": Array [
            "default",
          ],
        }
      `);
    });
  });
  describe('getInventoryViewInAppUrl', () => {
    it('should work with custom metrics', () => {
      const fields = {
        [TIMESTAMP]: '2022-01-01T00:00:00.000Z',
        [`${ALERT_RULE_PARAMETERS}.nodeType`]: 'host',
        [`${ALERT_RULE_PARAMETERS}.criteria.metric`]: ['custom'],
        [`${ALERT_RULE_PARAMETERS}.criteria.customMetric.id`]: ['alert-custom-metric'],
        [`${ALERT_RULE_PARAMETERS}.criteria.customMetric.aggregation`]: ['avg'],
        [`${ALERT_RULE_PARAMETERS}.criteria.customMetric.field`]: ['system.cpu.user.pct'],
      } as unknown as ParsedTechnicalFields & Record<string, any>;
      const url = getInventoryViewInAppUrl({
        fields,
        inventoryLocator: mockInventoryLocator,
        assetDetailsLocator: mockAssetDetailsLocator,
      });
      expect(mockInventoryLocator.getRedirectUrl).toHaveBeenCalledTimes(1);
      expect(url).toEqual(
        "/inventory?(customMetric:'(aggregation:avg,field:system.cpu.user.pct,id:alert-custom-metric,type:custom)',metric:'(aggregation:avg,field:system.cpu.user.pct,id:alert-custom-metric,type:custom)',nodeType:host,timestamp:1640995200000)"
      );
    });
    it('should work with non-custom metrics', () => {
      const fields = {
        [TIMESTAMP]: '2022-01-01T00:00:00.000Z',
        [`${ALERT_RULE_PARAMETERS}.nodeType`]: 'host',
        [`${ALERT_RULE_PARAMETERS}.criteria.metric`]: ['cpu'],
      } as unknown as ParsedTechnicalFields & Record<string, any>;
      const url = getInventoryViewInAppUrl({
        fields,
        inventoryLocator: mockInventoryLocator,
        assetDetailsLocator: mockAssetDetailsLocator,
      });
      expect(mockInventoryLocator.getRedirectUrl).toHaveBeenCalledTimes(1);
      expect(url).toEqual(
        "/inventory?(customMetric:'',metric:'(type:cpu)',nodeType:host,timestamp:1640995200000)"
      );
    });

    it('should point to asset details when nodeType is host and host.name is present', () => {
      const fields = {
        [TIMESTAMP]: '2022-01-01T00:00:00.000Z',
        [`${ALERT_RULE_PARAMETERS}.nodeType`]: 'host',
        [`${ALERT_RULE_PARAMETERS}.criteria.metric`]: ['cpu'],
        [`host.name`]: ['my-host'],
      } as unknown as ParsedTechnicalFields & Record<string, any>;
      const url = getInventoryViewInAppUrl({
        fields,
        inventoryLocator: mockInventoryLocator,
        assetDetailsLocator: mockAssetDetailsLocator,
      });
      expect(mockAssetDetailsLocator.getRedirectUrl).toHaveBeenCalledTimes(1);
      expect(url).toEqual(
        "/node/host/my-host?(dateRange:(from:'2022-01-01T00:00:00.000Z',to:'2022-01-01T00:15:00.000Z'),incomingAlertMetric:cpu)"
      );
    });

    it('should point to asset details when nodeType is container and container.id is present', () => {
      const fields = {
        [TIMESTAMP]: '2022-01-01T00:00:00.000Z',
        [`${ALERT_RULE_PARAMETERS}.nodeType`]: 'container',
        [`${ALERT_RULE_PARAMETERS}.criteria.metric`]: ['cpu'],
        [`container.id`]: ['my-container'],
      } as unknown as ParsedTechnicalFields & Record<string, any>;
      const url = getInventoryViewInAppUrl({
        fields,
        inventoryLocator: mockInventoryLocator,
        assetDetailsLocator: mockAssetDetailsLocator,
      });
      expect(mockAssetDetailsLocator.getRedirectUrl).toHaveBeenCalledTimes(1);
      expect(url).toEqual(
        "/node/container/my-container?(dateRange:(from:'2022-01-01T00:00:00.000Z',to:'2022-01-01T00:15:00.000Z'),incomingAlertMetric:cpu)"
      );
    });

    it('should work with custom metrics when ALERT_RULE_PARAMETERS is an object', () => {
      const fields = {
        '@timestamp': '2022-01-01T00:00:00.000Z',
        'kibana.alert.rule.parameters': {
          sourceId: 'default',
          criteria: [
            {
              comparator: '>',
              timeSize: 1,
              metric: 'custom',
              threshold: [5],
              customMetric: {
                field: 'system.cpu.user.pct',
                aggregation: 'avg',
                id: 'alert-custom-metric',
                type: 'custom',
              },
              timeUnit: 'm',
            },
          ],
          nodeType: 'host',
        },
        _id: 'eaa439aa-a4bb-4e7c-b7f8-fbe532ca7366',
        _index: '.internal.alerts-observability.metrics.alerts-default-000001',
      } as unknown as ParsedTechnicalFields & Record<string, any>;
      const url = getInventoryViewInAppUrl({
        fields,
        inventoryLocator: mockInventoryLocator,
        assetDetailsLocator: mockAssetDetailsLocator,
      });
      expect(mockInventoryLocator.getRedirectUrl).toHaveBeenCalledTimes(1);
      expect(url).toEqual(
        "/inventory?(customMetric:'(aggregation:avg,field:system.cpu.user.pct,id:alert-custom-metric,type:custom)',metric:'(aggregation:avg,field:system.cpu.user.pct,id:alert-custom-metric,type:custom)',nodeType:host,timestamp:1640995200000)"
      );
    });

    it('should work with non-custom metrics when ALERT_RULE_PARAMETERS is an object', () => {
      const fields = {
        '@timestamp': '2022-01-01T00:00:00.000Z',
        'kibana.alert.rule.parameters': {
          sourceId: 'default',
          criteria: [
            {
              comparator: '>',
              timeSize: 1,
              metric: 'cpu',
              threshold: [5],
              timeUnit: 'm',
            },
          ],
          nodeType: 'host',
        },
        _id: 'eaa439aa-a4bb-4e7c-b7f8-fbe532ca7366',
        _index: '.internal.alerts-observability.metrics.alerts-default-000001',
      } as unknown as ParsedTechnicalFields & Record<string, any>;
      const url = getInventoryViewInAppUrl({
        fields,
        inventoryLocator: mockInventoryLocator,
        assetDetailsLocator: mockAssetDetailsLocator,
      });
      expect(mockInventoryLocator.getRedirectUrl).toHaveBeenCalledTimes(1);
      expect(url).toEqual(
        "/inventory?(customMetric:'',metric:'(type:cpu)',nodeType:host,timestamp:1640995200000)"
      );
    });
  });
});

describe('Metrics Rule', () => {
  describe('getMetricsViewInAppUrl', () => {
    it('should point to host-details when host.name is present', () => {
      const fields = {
        [TIMESTAMP]: '2022-01-01T00:00:00.000Z',
        [`host.name`]: ['my-host'],
      } as unknown as ParsedTechnicalFields & Record<string, any>;
      const url = getMetricsViewInAppUrl({
        fields,
        assetDetailsLocator: mockAssetDetailsLocator,
        nodeType: 'host',
      });
      expect(mockAssetDetailsLocator.getRedirectUrl).toHaveBeenCalledTimes(1);
      expect(url).toEqual(
        "/node/host/my-host?(dateRange:(from:'2022-01-01T00:00:00.000Z',to:'2022-01-01T00:15:00.000Z'))"
      );
    });

    it('should point to metrics explorer', () => {
      const fields = {
        [TIMESTAMP]: '2022-01-01T00:00:00.000Z',
      } as unknown as ParsedTechnicalFields & Record<string, any>;
      const url = getMetricsViewInAppUrl({ fields });
      expect(url).toEqual('/app/metrics/explorer');
    });
  });
});
