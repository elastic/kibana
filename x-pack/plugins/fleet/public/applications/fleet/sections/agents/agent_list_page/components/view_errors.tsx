/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import React from 'react';
import type { EuiBasicTableProps } from '@elastic/eui';
import { EuiAccordion, EuiToolTip, EuiText, EuiBasicTable } from '@elastic/eui';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import moment from 'moment';

import { i18n } from '@kbn/i18n';

import type { ActionErrorResult } from '../../../../../../../common/types';

import { buildQuery } from '../../agent_details_page/components/agent_logs/build_query';
import { ViewLogsButton } from '../../agent_details_page/components/agent_logs/view_logs_button';

import type { ActionStatus } from '../../../../types';
import { useStartServices } from '../../../../hooks';

const TruncatedEuiText = styled(EuiText)`
  overflow: hidden;
  max-height: 3rem;
  text-overflow: ellipsis;
`;

export const ViewErrors: React.FunctionComponent<{ action: ActionStatus }> = ({ action }) => {
  const coreStart = useStartServices();
  const isLogsUIAvailable = !coreStart.cloud?.isServerlessEnabled;

  const getLogsButton = (agentId: string, timestamp: string, viewInLogs: boolean) => {
    const startTime = moment(timestamp).subtract(5, 'm').toISOString();
    const endTime = moment(timestamp).add(5, 'm').toISOString();

    const logStreamQuery = buildQuery({
      agentId,
      datasets: ['elastic_agent'],
      logLevels: ['error'],
      userQuery: '',
    });
    return (
      <ViewLogsButton
        viewInLogs={viewInLogs}
        logStreamQuery={logStreamQuery}
        startTime={startTime}
        endTime={endTime}
      />
    );
  };

  const columns: EuiBasicTableProps<ActionErrorResult>['columns'] = [
    {
      field: 'hostname',
      name: i18n.translate('xpack.fleet.agentList.viewErrors.hostnameColumnTitle', {
        defaultMessage: 'Host Name',
      }),
      render: (hostname: string) => (
        <EuiText size="s" data-test-subj="hostText">
          {hostname}
        </EuiText>
      ),
    },
    {
      field: 'error',
      name: i18n.translate('xpack.fleet.agentList.viewErrors.errorColumnTitle', {
        defaultMessage: 'Error Message',
      }),
      render: (error: string) => (
        <EuiToolTip content={error}>
          <TruncatedEuiText size="s" color="red" data-test-subj="errorText">
            {error}
          </TruncatedEuiText>
        </EuiToolTip>
      ),
    },
    {
      field: 'agentId',
      name: i18n.translate('xpack.fleet.agentList.viewErrors.actionColumnTitle', {
        defaultMessage: 'Action',
      }),
      render: (agentId: string) => {
        const errorItem = (action.latestErrors ?? []).find((item) => item.agentId === agentId);
        return (
          <RedirectAppLinks coreStart={coreStart}>
            {getLogsButton(agentId, errorItem!.timestamp, !!isLogsUIAvailable)}
          </RedirectAppLinks>
        );
      },
    },
  ];

  return (
    <>
      <EuiAccordion id={action.actionId + '_errors'} buttonContent="Show errors">
        <EuiBasicTable items={action.latestErrors ?? []} columns={columns} tableLayout="auto" />
      </EuiAccordion>
    </>
  );
};
