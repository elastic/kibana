/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { SecurityJob } from '../../../../../common/components/ml_popover/types';
import { LinkAnchor } from '../../../../../common/components/links';
import * as i18n from '../translations';
import { useEnableDataFeed } from '../../../../../common/components/ml_popover/hooks/use_enable_data_feed';

export const EnableJob = ({
  job,
  isLoading,
  onJobEnabled,
}: {
  job: SecurityJob;
  isLoading: boolean;
  onJobEnabled: (job: SecurityJob) => void;
}) => {
  const { enableDatafeed, isLoading: isEnabling } = useEnableDataFeed();

  const handleChange = useCallback(async () => {
    const result = await enableDatafeed(job, job.latestTimestampMs || 0);

    if (result.enabled) {
      onJobEnabled(job);
    }
  }, [enableDatafeed, job, onJobEnabled]);

  return isLoading || isEnabling ? (
    <EuiLoadingSpinner size="m" data-test-subj="job-switch-loader" />
  ) : (
    <LinkAnchor onClick={handleChange} data-test-subj="enable-job">
      {i18n.RUN_JOB}
    </LinkAnchor>
  );
};
