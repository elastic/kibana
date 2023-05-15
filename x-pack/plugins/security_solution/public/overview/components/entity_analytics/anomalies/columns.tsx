/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { EuiBasicTableColumn } from '@elastic/eui';
import * as i18n from './translations';
import type { SecurityJob } from '../../../../common/components/ml_popover/types';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';

import { TotalAnomalies } from './components/total_anomalies';
import type { AnomaliesCount } from '../../../../common/components/ml/anomaly/use_anomalies_search';

type AnomaliesColumns = Array<EuiBasicTableColumn<AnomaliesCount>>;

const MediumShadeText = styled.span`
  color: ${({ theme }) => theme.eui.euiColorMediumShade};
`;

export const useAnomaliesColumns = (
  loading: boolean,
  onJobEnabled: (job: SecurityJob) => void,
  recentlyEnabledJobIds: string[]
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
          return (
            <TotalAnomalies
              count={count}
              job={job}
              entity={entity}
              loading={loading}
              onJobEnabled={onJobEnabled}
              recentlyEnabledJobIds={recentlyEnabledJobIds}
            />
          );
        },
      },
    ],
    [loading, onJobEnabled, recentlyEnabledJobIds]
  );
  return columns;
};
