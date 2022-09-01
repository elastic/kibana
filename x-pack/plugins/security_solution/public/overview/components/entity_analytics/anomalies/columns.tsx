/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { ML_PAGES, useMlHref } from '@kbn/ml-plugin/public';
import * as i18n from './translations';
import type { AnomaliesCount } from '../../../../common/components/ml/anomaly/use_anomalies_search';
import { AnomalyJobStatus } from '../../../../common/components/ml/anomaly/use_anomalies_search';
import { useKibana } from '../../../../common/lib/kibana';
import { LinkAnchor } from '../../../../common/components/links';

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
        render: (name, { status, count }) => {
          if (count > 0 || status === AnomalyJobStatus.enabled) {
            return name;
          } else {
            return <MediumShadeText>{name}</MediumShadeText>;
          }
        },
      },
      {
        field: 'count',
        sortable: ({ count, status }) => {
          if (count > 0) {
            return count;
          }
          if (status === AnomalyJobStatus.disabled) {
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

          if (count > 0 || status === AnomalyJobStatus.enabled) {
            return count;
          } else {
            if (status === AnomalyJobStatus.disabled && jobId) {
              return <EnableJobLink jobId={jobId} />;
            }

            return <MediumShadeText>{I18N_JOB_STATUS[status]}</MediumShadeText>;
          }
        },
      },
    ],
    [loading]
  );
  return columns;
};

const I18N_JOB_STATUS = {
  [AnomalyJobStatus.disabled]: i18n.JOB_STATUS_DISABLED,
  [AnomalyJobStatus.failed]: i18n.JOB_STATUS_FAILED,
  [AnomalyJobStatus.uninstalled]: i18n.JOB_STATUS_UNINSTALLED,
};

const EnableJobLink = ({ jobId }: { jobId: string }) => {
  const {
    services: {
      ml,
      http,
      application: { navigateToUrl },
    },
  } = useKibana();

  const jobUrl = useMlHref(ml, http.basePath.get(), {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    pageState: {
      jobId,
    },
  });

  const onClick = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToUrl(jobUrl);
    },
    [jobUrl, navigateToUrl]
  );

  return (
    <LinkAnchor data-test-subj="jobs-table-link" href={jobUrl} onClick={onClick}>
      {i18n.RUN_JOB}
    </LinkAnchor>
  );
};
