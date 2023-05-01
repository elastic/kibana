/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { useMlKibana } from '../../contexts/kibana';
import { Job } from '../../../../common/types/anomaly_detection_jobs';
import { UrlConfig } from '../../../../common/types/custom_urls';
import { type DataFrameAnalyticsConfig } from '../../../../common/types/data_frame_analytics';
import { CustomUrls } from './custom_urls';

export interface CustomUrlsWrapperProps {
  job: Job | DataFrameAnalyticsConfig;
  jobCustomUrls: UrlConfig[];
  setCustomUrls: (customUrls: UrlConfig[]) => void;
  editMode?: 'inline' | 'modal';
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

  return <CustomUrls {...props} currentTimeFilter={timefilter.getTime()} />;
};
