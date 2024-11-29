/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  DataQualityDetailsLocatorParams,
  DATA_QUALITY_DETAILS_LOCATOR_ID,
} from '@kbn/deeplinks-observability';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { useDateRangePicker } from '../hooks/use_date_picker';
import { LegendActionItem } from './legend_action_item';
import { UX_LABELS } from '../../translations';

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
    const locator = url.locators.get<DataQualityDetailsLocatorParams>(
      DATA_QUALITY_DETAILS_LOCATOR_ID
    );
    const onClickDataQuality = async () => {
      const locatorParams: DataQualityDetailsLocatorParams = {
        dataStream: dataStreamName,
        timeRange: { from: startDate, to: endDate, refresh: { pause: true, value: 0 } },
      };
      if (locator) {
        await locator.navigate(locatorParams);
      }
    };
    return (
      <LegendActionItem label={UX_LABELS.dataQualityPopup.view} onClick={onClickDataQuality} />
    );
  }
);
