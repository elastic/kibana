/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useValues } from 'kea';

import { KibanaLogic } from '../../../shared/kibana';

import { AnalyticsCollectionDataViewLogic } from './analytics_collection_data_view_logic';
import { AnalyticsCollectionToolbarLogic } from './analytics_collection_toolbar/analytics_collection_toolbar_logic';

export const useDiscoverLink = (): string | null => {
  const { application } = useValues(KibanaLogic);
  const { dataView } = useValues(AnalyticsCollectionDataViewLogic);
  const { refreshInterval, timeRange } = useValues(AnalyticsCollectionToolbarLogic);

  return dataView
    ? application.getUrlForApp('discover', {
        path: `#/?_a=(index:'${
          dataView.id
        }')&_g=(filters:!(),refreshInterval:(pause:!${refreshInterval.pause
          .toString()
          .charAt(0)},value:${refreshInterval.value}),time:(from:${timeRange.from},to:${
          timeRange.to
        }))`,
      })
    : null;
};
