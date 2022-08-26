/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import { ML_PAGES, useMlHref } from '@kbn/ml-plugin/public';
import * as i18n from './translations';
import type { AnomaliesCount } from '../../../../common/components/ml/anomaly/use_anomalies_search';
import { useKibana } from '../../../../common/lib/kibana';
import type { NotableAnomaliesJobId } from './config';

type AnomaliesColumns = Array<EuiBasicTableColumn<AnomaliesCount>>;

const MediumShadeText = styled.span`
  color: ${({ theme }) => theme.eui.euiColorMediumShade};
`;

export const useAnomaliesColumns = (loading: boolean): AnomaliesColumns => {
  const columns: AnomaliesColumns = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.ANOMALY_NAME,
        truncateText: true,
        mobileOptions: { show: true },
        'data-test-subj': 'anomalies-table-column-name',
        render: (name, { status }) => {
          if (status === 'enabled') {
            return name;
          } else {
            return <MediumShadeText>{name}</MediumShadeText>;
          }
        },
      },
      {
        field: 'count',
        sortable: ({ count, status }) => {
          if (status === 'enabled') {
            return count;
          }
          if (status === 'disabled') {
            return -1;
          }
          return -2;
        },
        truncateText: true,
        align: 'right',
        name: i18n.ANOMALY_COUNT,
        mobileOptions: { show: true },
        width: '15%',
        'data-test-subj': 'anomalies-table-column-count',
        render: (count, { status, jobId }) => {
          if (loading) return '';

          if (count > 0 || status === 'enabled') {
            return count;
          } else {
            if (status === 'disabled') {
              return <EnableJobLink jobId={jobId} />;
            }

            return <MediumShadeText>{status}</MediumShadeText>;
          }
        },
      },
    ],
    [loading]
  );
  return columns;
};

const EnableJobLink = ({ jobId }: { jobId: NotableAnomaliesJobId }) => {
  const {
    services: { ml, http },
  } = useKibana();

  const jobUrl = useMlHref(ml, http.basePath.get(), {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    pageState: {
      jobId,
    },
  });

  return (
    <EuiLink data-test-subj="jobs-table-link" href={jobUrl}>
      {i18n.RUN_JOB}
    </EuiLink>
  );
};
