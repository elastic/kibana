/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import {
  isJobFailed,
  isJobLoading,
  isJobStarted,
} from '../../../../../common/machine_learning/helpers';
import type { AnomalyEntity } from '../../../../common/components/ml/anomaly/use_anomalies_search';
import type { SecurityJob } from '../../../../common/components/ml_popover/types';
import * as i18n from '../translations';
import { AnomaliesTabLink } from './anomalies_tab_link';
import { EnableJob } from './enable_job';

export const TotalAnomalies = ({
  count,
  job,
  entity,
  recentlyEnabledJobIds,
  loading,
  onJobEnabled,
}: {
  count: number;
  job: SecurityJob;
  entity: AnomalyEntity;
  recentlyEnabledJobIds: string[];
  loading: boolean;
  onJobEnabled: (job: SecurityJob) => void;
}) => {
  if (isJobLoading(job.jobState, job.datafeedState)) {
    return <>{i18n.JOB_STATUS_WAITING}</>;
  } else if (isJobFailed(job.jobState, job.datafeedState)) {
    return <>{i18n.JOB_STATUS_FAILED}</>;
  } else if (
    count > 0 ||
    isJobStarted(job.jobState, job.datafeedState) ||
    recentlyEnabledJobIds.includes(job.id)
  ) {
    return <AnomaliesTabLink count={count} jobId={job.id} entity={entity} />;
  } else if (job.isCompatible) {
    return <EnableJob job={job} isLoading={loading} onJobEnabled={onJobEnabled} />;
  } else {
    return <EuiIcon aria-label="Warning" size="s" type="warning" color="warning" />;
  }
};
