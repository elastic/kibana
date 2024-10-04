/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiListGroupItem } from '@elastic/eui';

import React from 'react';
import { DataQualityLocatorParams, DATA_QUALITY_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';

function getDatasetFromDataStream(dataStreamName: string): string | null {
  const parts = dataStreamName.split('-');
  if (parts.length !== 3) {
    return null;
  }
  return parts[1];
}

export const DatasetQualityLink = React.memo(({ dataStreamName }: { dataStreamName: string }) => {
  const {
    services: {
      share: { url },
    },
  } = useKibanaContextForPlugin();

  const locator = url.locators.get<DataQualityLocatorParams>(DATA_QUALITY_LOCATOR_ID);
  const onClickDataQuality = async () => {
    const locatorParams: DataQualityLocatorParams = {
      filters: {
        // TODO: get time range from our page state
        timeRange: { from: 'now-15m', to: 'now', refresh: { pause: true, value: 0 } },
      },
    };
    const dataset = getDatasetFromDataStream(dataStreamName);
    if (locatorParams?.filters && dataset) {
      locatorParams.filters.query = dataset;
    }
    if (locator) {
      await locator.navigate(locatorParams);
    }
  };

  return <EuiListGroupItem label="View data quality" onClick={() => onClickDataQuality()} />;
});
