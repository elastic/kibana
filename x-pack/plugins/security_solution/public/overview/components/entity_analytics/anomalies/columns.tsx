/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import * as i18n from './translations';
import type { AnomaliesCount } from '../../../../common/components/ml/anomaly/use_anomalies_search';
import { LinkAnchor } from '../../../../common/components/links';
import type { SecurityJob } from '../../../../common/components/ml_popover/types';
import {
  isJobFailed,
  isJobStarted,
  isJobLoading,
} from '../../../../../common/machine_learning/helpers';
import { AnomaliesCountLink } from './anomalies_count_link';

type AnomaliesColumns = Array<EuiBasicTableColumn<AnomaliesCount>>;

const MediumShadeText = styled.span`
  color: ${({ theme }) => theme.eui.euiColorMediumShade};
`;

export const useAnomaliesColumns = (
  loading: boolean,
  onJobStateChange: (job: SecurityJob) => Promise<void>
): AnomaliesColumns => {
  const columns: AnomaliesColumns = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.ANOMALY_NAME,
        truncateText: true,
        mobileOptions: { show: true },
        'data-test-subj': 'anomalies-table-column-name',
        render: (jobName, { count, job }) => {
          if (count > 0 || (job && isJobStarted(job.jobState, job.datafeedState))) {
            return jobName;
          } else {
            return <MediumShadeText>{jobName}</MediumShadeText>;
          }
        },
      },
      {
        field: 'count',
        sortable: ({ count, job }) => {
          if (count > 0) {
            return count;
          }

          if (job && isJobStarted(job.jobState, job.datafeedState)) {
            return 0;
          }

          return -1;
        },
        truncateText: true,
        align: 'right',
        name: i18n.ANOMALY_COUNT,
        mobileOptions: { show: true },
        width: '15%',
        'data-test-subj': 'anomalies-table-column-count',
        render: (count, { entity, job }) => {
          if (!job) return '';

          if (count > 0 || isJobStarted(job.jobState, job.datafeedState)) {
            return <AnomaliesCountLink count={count} jobId={job.id} entity={entity} />;
          } else if (isJobFailed(job.jobState, job.datafeedState)) {
            return i18n.JOB_STATUS_FAILED;
          } else if (job.isCompatible) {
            return <EnableJob job={job} isLoading={loading} onJobStateChange={onJobStateChange} />;
          } else {
            return <EuiIcon aria-label="Warning" size="s" type="warning" color="warning" />;
          }
        },
      },
    ],
    [loading, onJobStateChange]
  );
  return columns;
};

const EnableJob = ({
  job,
  isLoading,
  onJobStateChange,
}: {
  job: SecurityJob;
  isLoading: boolean;
  onJobStateChange: (job: SecurityJob) => Promise<void>;
}) => {
  const handleChange = useCallback(() => onJobStateChange(job), [job, onJobStateChange]);

  return isLoading || isJobLoading(job.jobState, job.datafeedState) ? (
    <EuiLoadingSpinner size="m" data-test-subj="job-switch-loader" />
  ) : (
    <LinkAnchor onClick={handleChange} data-test-subj="enable-job">
      {i18n.RUN_JOB}
    </LinkAnchor>
  );
};
