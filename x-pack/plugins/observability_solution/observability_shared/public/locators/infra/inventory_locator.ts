/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SerializableRecord } from '@kbn/utility-types';
import rison from '@kbn/rison';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';

export type InventoryLocator = LocatorPublic<InventoryLocatorParams>;

export interface InventoryLocatorParams extends SerializableRecord {
  inventoryViewId?: string;
  waffleFilter?: {
    expression: string;
    kind: string;
  };
  waffleTime?: {
    currentTime: number;
    isAutoReloading: boolean;
  };
  waffleOptions?: {
    accountId: string;
    autoBounds: boolean;
    boundsOverride: {
      max: number;
      min: number;
    };
  };
  customMetrics: string;
  customOptions?: string;
  groupBy?: { field: string };
  legend?: {
    palette: string;
    reverseColors: boolean;
    steps: number;
  };
  metric: { type: string };
  nodeType: string;
  region?: string;
  sort: {
    by: string;
    direction: 'desc' | 'async';
  };
  timelineOpen: boolean;
  view: 'map' | 'table';
  state?: SerializableRecord;
}

const INVENTORY_LOCATOR_ID = 'INVENTORY_LOCATOR';

export class InventoryLocatorDefinition implements LocatorDefinition<InventoryLocatorParams> {
  public readonly id = INVENTORY_LOCATOR_ID;

  public readonly getLocation = async (params: InventoryLocatorParams) => {
    const paramsWithDefaults = {
      waffleFilter: params.waffleFilter ?? { kind: 'kuery', expression: '' },
      waffleTime: params.waffleTime ?? {
        currentTime: new Date().getTime(),
        isAutoReloading: false,
      },
      waffleOptions: params.waffleOptions ?? {
        accountId: '',
        autoBounds: true,
        boundsOverride: { max: 1, min: 0 },
      },
      customMetrics: params.customMetrics ?? 'cpu',
      customOptions: params.customOptions ?? '',
      groupBy: params.groupBy ?? {},
      legend: params.legend ?? { palette: 'cool', reverseColors: false, steps: 10 },
      metric: params.metric,
      nodeType: params.nodeType,
      region: params.region ?? '',
      sort: params.sort ?? { by: 'name', direction: 'desc' },
      timelineOpen: params.timelineOpen ?? false,
      view: params.view ?? 'map',
    };
    const waffleFilter = rison.encodeUnknown(paramsWithDefaults.waffleFilter);
    const waffleTime = rison.encodeUnknown(paramsWithDefaults.waffleTime);
    const waffleOptions = rison.encodeUnknown(paramsWithDefaults.waffleOptions);
    const customMetrics = rison.encodeUnknown(paramsWithDefaults.customMetrics);
    const customOptions = rison.encodeUnknown(paramsWithDefaults.customOptions);
    const groupBy = rison.encodeUnknown(paramsWithDefaults.groupBy);
    const legend = rison.encodeUnknown(paramsWithDefaults.legend);
    const metric = rison.encodeUnknown(paramsWithDefaults.metric);
    const nodeType = rison.encodeUnknown(paramsWithDefaults.nodeType);
    const region = rison.encodeUnknown(paramsWithDefaults.region);
    const sort = rison.encodeUnknown(paramsWithDefaults.sort);
    const timelineOpen = rison.encodeUnknown(paramsWithDefaults.timelineOpen);
    const view = rison.encodeUnknown(paramsWithDefaults.view);

    return {
      app: 'metrics',
      path: `/inventory?waffleFilter=${waffleFilter}&waffleTime=${waffleTime}&waffleOptions=${waffleOptions}&customMetrics=${customMetrics}&customOptions=${customOptions}&groupBy=${groupBy}&legend=${legend}&metric=${metric}&nodeType=${nodeType}&region=${region}&sort=${sort}&timelineOpen=${timelineOpen}&view=${view}`,
      state: params.state ? params.state : {},
    };
  };
}
