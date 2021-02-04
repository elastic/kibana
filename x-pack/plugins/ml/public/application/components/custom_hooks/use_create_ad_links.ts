/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useMlKibana, useUiSettings } from '../../contexts/kibana';
import {
  ANOMALY_DETECTION_DEFAULT_TIME_RANGE,
  ANOMALY_DETECTION_ENABLE_TIME_RANGE,
} from '../../../../common/constants/settings';
import { mlJobService } from '../../services/job_service';

export const useCreateADLinks = () => {
  const {
    services: {
      http: { basePath },
    },
  } = useMlKibana();

  const useUserTimeSettings = useUiSettings().get(ANOMALY_DETECTION_ENABLE_TIME_RANGE);
  const userTimeSettings = useUiSettings().get(ANOMALY_DETECTION_DEFAULT_TIME_RANGE);
  const createLinkWithUserDefaults = useCallback(
    (location, jobList) => {
      const resultsUrl = mlJobService.createResultsUrlForJobs(
        jobList,
        location,
        useUserTimeSettings === true && userTimeSettings !== undefined
          ? userTimeSettings
          : undefined
      );
      return `${basePath.get()}/app/ml/${resultsUrl}`;
    },
    [basePath]
  );
  return { createLinkWithUserDefaults };
};

export type CreateLinkWithUserDefaults = ReturnType<
  typeof useCreateADLinks
>['createLinkWithUserDefaults'];
