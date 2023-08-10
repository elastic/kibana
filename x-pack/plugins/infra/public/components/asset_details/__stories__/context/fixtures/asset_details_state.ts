/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import { UseAssetDetailsStateProps } from '../../../hooks/use_asset_details_state';

export const assetDetailsState: UseAssetDetailsStateProps['state'] = {
  asset: {
    name: 'host1',
    id: 'host1-macOS',
    ip: '192.168.0.1',
  },
  overrides: {
    overview: {
      metricsDataView: {
        id: 'default',
        getFieldByName: () => 'hostname' as unknown as DataViewField,
      } as unknown as DataView,
      logsDataView: {
        id: 'default',
        getFieldByName: () => 'hostname' as unknown as DataViewField,
      } as unknown as DataView,
    },
    metadata: {
      showActionsColumn: true,
    },
  },
  assetType: 'host',
  dateRange: {
    from: '2023-04-09T11:07:49Z',
    to: '2023-04-09T11:23:49Z',
  },
};
