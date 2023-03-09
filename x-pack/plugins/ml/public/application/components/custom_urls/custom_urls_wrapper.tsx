/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, FC } from 'react';
import { DataView } from '@kbn/data-views-plugin/public';
import { useMlKibana } from '../../contexts/kibana';
import { Job } from '../../../../common/types/anomaly_detection_jobs';
import { UrlConfig } from '../../../../common/types/custom_urls';
import { getDataViewIdFromName } from '../../util/index_utils';
import {
  isDataFrameAnalyticsConfigs,
  type DataFrameAnalyticsConfig,
} from '../../../../common/types/data_frame_analytics';
import { CustomUrls } from './custom_urls';

export interface CustomUrlsWrapperProps {
  job: Job | DataFrameAnalyticsConfig;
  jobCustomUrls: UrlConfig[];
  setCustomUrls: (customUrls: UrlConfig[]) => void;
  editMode?: 'inline' | 'modal';
}

export const CustomUrlsWrapper: FC<CustomUrlsWrapperProps> = (props) => {
  const [dataView, setDataView] = useState<DataView | undefined>();

  const {
    services: {
      data: {
        dataViews,
        query: {
          timefilter: { timefilter },
        },
      },
    },
  } = useMlKibana();

  useEffect(() => {
    let active = true;

    async function loadDataView() {
      if (isDataFrameAnalyticsConfigs(props.job)) {
        const destIndex = props.job.dest.index;
        const sourceIndex = props.job.source.index[0];
        let dataViewId: string | null;
        let dv: DataView | undefined;

        try {
          dataViewId = await getDataViewIdFromName(destIndex);
          dv = await dataViews.get(dataViewId ?? '');

          if (dv === undefined) {
            dataViewId = await getDataViewIdFromName(sourceIndex);
            dv = await dataViews.get(dataViewId ?? '');
          }
          if (!active) return;
          setDataView(dv);
        } catch (e) {
          dv = undefined;
        }

        return dv;
      }
    }

    loadDataView();
    return () => {
      active = false;
    };
  }, [dataViews, props.job]);

  return <CustomUrls {...props} dataView={dataView} currentTimeFilter={timefilter.getTime()} />;
};
