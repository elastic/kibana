/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'querystring';

import styled from 'styled-components';
import React from 'react';
import { encode } from '@kbn/rison';
import type { EuiBasicTableProps } from '@elastic/eui';
import { EuiButton, EuiAccordion, EuiToolTip, EuiText, EuiBasicTable } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';

import { i18n } from '@kbn/i18n';

import type { ActionErrorResult } from '../../../../../../../common/types';

import { buildQuery } from '../../agent_details_page/components/agent_logs/build_query';

import type { ActionStatus } from '../../../../types';
import { useStartServices } from '../../../../hooks';

const TruncatedEuiText = styled(EuiText)`
  overflow: hidden;
  max-height: 3rem;
  text-overflow: ellipsis;
`;

export const ViewErrors: React.FunctionComponent<{ action: ActionStatus }> = ({ action }) => {
  const coreStart = useStartServices();

  const logStreamQuery = (agentId: string) =>
    buildQuery({
      agentId,
      datasets: ['elastic_agent'],
      logLevels: ['error'],
      userQuery: '',
    });

  const getErrorLogsUrl = (agentId: string, timestamp: string) => {
    const queryParams = stringify({
      logPosition: encode({
        position: { time: Date.parse(timestamp) },
        streamLive: false,
      }),
      logFilter: encode({
        expression: logStreamQuery(agentId),
        kind: 'kuery',
      }),
    });
    return coreStart.http.basePath.prepend(`/app/logs/stream?${queryParams}`);
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
            <EuiButton
              href={getErrorLogsUrl(agentId, errorItem!.timestamp)}
              color="danger"
              data-test-subj="viewLogsBtn"
            >
              <FormattedMessage
                id="xpack.fleet.agentActivityFlyout.reviewErrorLogs"
                defaultMessage="Review error logs"
              />
            </EuiButton>
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
