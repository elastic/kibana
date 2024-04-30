/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { MlUrlConfig } from '@kbn/ml-anomaly-utils';
import type { DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import { useDashboardService } from '../../services/dashboard_service';
import { useMlKibana } from '../../contexts/kibana';
import type { Job } from '../../../../common/types/anomaly_detection_jobs';
import { CustomUrls } from './custom_urls';

export interface CustomUrlsWrapperProps {
  job: Job | DataFrameAnalyticsConfig;
  jobCustomUrls: MlUrlConfig[];
  setCustomUrls: (customUrls: MlUrlConfig[]) => void;
  editMode?: 'inline' | 'modal';
  isPartialDFAJob?: boolean;
}

export const CustomUrlsWrapper: FC<CustomUrlsWrapperProps> = (props) => {
  const {
    services: {
      data: {
        query: {
          timefilter: { timefilter },
        },
      },
    },
  } = useMlKibana();
  const dashboardService = useDashboardService();

  return (
    <CustomUrls
      {...props}
      currentTimeFilter={timefilter.getTime()}
      dashboardService={dashboardService}
    />
  );
};
