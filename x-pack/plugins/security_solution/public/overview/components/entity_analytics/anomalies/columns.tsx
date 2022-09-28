/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import { ML_PAGES, useMlHref } from '@kbn/ml-plugin/public';
import { useDispatch } from 'react-redux';
import * as i18n from './translations';
import type { AnomaliesCount } from '../../../../common/components/ml/anomaly/use_anomalies_search';
import {
  AnomalyJobStatus,
  AnomalyEntity,
} from '../../../../common/components/ml/anomaly/use_anomalies_search';
import { useKibana } from '../../../../common/lib/kibana';
import { LinkAnchor, SecuritySolutionLinkAnchor } from '../../../../common/components/links';
import { SecurityPageName } from '../../../../app/types';
import { usersActions } from '../../../../users/store';
import { hostsActions } from '../../../../hosts/store';
import { HostsType } from '../../../../hosts/store/model';
import { UsersType } from '../../../../users/store/model';

type AnomaliesColumns = Array<EuiBasicTableColumn<AnomaliesCount>>;

const MediumShadeText = styled.span`
  color: ${({ theme }) => theme.eui.euiColorMediumShade};
`;

const INSTALL_JOBS_DOC =
  'https://www.elastic.co/guide/en/machine-learning/current/ml-ad-run-jobs.html';

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
        render: (count, { status, jobId, entity }) => {
          if (loading) return '';

          if (count > 0 || status === AnomalyJobStatus.enabled) {
            return <AnomaliesTabLink count={count} jobId={jobId} entity={entity} />;
          } else {
            if (status === AnomalyJobStatus.disabled && jobId) {
              return <EnableJobLink jobId={jobId} />;
            }

            if (status === AnomalyJobStatus.uninstalled) {
              return (
                <EuiLink external target={'_blank'} href={INSTALL_JOBS_DOC}>
                  {i18n.JOB_STATUS_UNINSTALLED}
                </EuiLink>
              );
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

const AnomaliesTabLink = ({
  count,
  jobId,
  entity,
}: {
  count: number;
  jobId?: string;
  entity: AnomalyEntity;
}) => {
  const dispatch = useDispatch();

  const deepLinkId =
    entity === AnomalyEntity.User
      ? SecurityPageName.usersAnomalies
      : SecurityPageName.hostsAnomalies;

  const onClick = useCallback(() => {
    if (!jobId) return;

    if (entity === AnomalyEntity.User) {
      dispatch(
        usersActions.updateUsersAnomaliesJobIdFilter({
          jobIds: [jobId],
          usersType: UsersType.page,
        })
      );

      dispatch(
        usersActions.updateUsersAnomaliesInterval({
          interval: 'second',
          usersType: UsersType.page,
        })
      );
    } else {
      dispatch(
        hostsActions.updateHostsAnomaliesJobIdFilter({
          jobIds: [jobId],
          hostsType: HostsType.page,
        })
      );

      dispatch(
        hostsActions.updateHostsAnomaliesInterval({
          interval: 'second',
          hostsType: HostsType.page,
        })
      );
    }
  }, [jobId, dispatch, entity]);

  return (
    <SecuritySolutionLinkAnchor onClick={onClick} deepLinkId={deepLinkId}>
      {count}
    </SecuritySolutionLinkAnchor>
  );
};
