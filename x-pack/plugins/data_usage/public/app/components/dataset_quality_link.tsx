/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiListGroupItem } from '@elastic/eui';
import { DataQualityLocatorParams, DATA_QUALITY_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { useDateRangePicker } from '../hooks/use_date_picker';

interface DatasetQualityLinkProps {
  dataStreamName: string;
}

export const DatasetQualityLink: React.FC<DatasetQualityLinkProps> = React.memo(
  ({ dataStreamName }) => {
    const { dateRangePickerState } = useDateRangePicker();
    const {
      services: {
        share: { url },
      },
    } = useKibanaContextForPlugin();
    const { startDate, endDate } = dateRangePickerState;
    const locator = url.locators.get<DataQualityLocatorParams>(DATA_QUALITY_LOCATOR_ID);
    const onClickDataQuality = async () => {
      const locatorParams: DataQualityLocatorParams = {
        filters: {
          timeRange: { from: startDate, to: endDate, refresh: { pause: true, value: 0 } },
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
    return <EuiListGroupItem label="View data quality" onClick={onClickDataQuality} />;
  }
);

function getDatasetFromDataStream(dataStreamName: string): string | null {
  const parts = dataStreamName.split('-');
  if (parts.length !== 3) {
    return null;
  }
  return parts[1];
}
