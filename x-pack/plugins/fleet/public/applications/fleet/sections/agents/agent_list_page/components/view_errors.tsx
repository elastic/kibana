/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'querystring';

import React from 'react';
import { encode } from '@kbn/rison';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiAccordion,
  EuiToolTip,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';

import { buildQuery } from '../../agent_details_page/components/agent_logs/build_query';

import type { ActionStatus } from '../../../../types';
import { useStartServices } from '../../../../hooks';

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

  return (
    <>
      <EuiAccordion id={action.actionId + '_errors'} buttonContent="Show errors">
        <EuiFlexGroup direction="column" alignItems="flexStart">
          {(action.latestErrors ?? []).map((errorItem: any) => (
            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiToolTip content={errorItem.error}>
                    <EuiText color="red">
                      {errorItem.error.length > 80
                        ? errorItem.error.slice(0, 80) + '...'
                        : errorItem.error}
                    </EuiText>
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <RedirectAppLinks coreStart={coreStart}>
                    <EuiButton
                      href={getErrorLogsUrl(errorItem.agentId, errorItem.timestamp)}
                      iconType="popout"
                      color="danger"
                    >
                      <FormattedMessage
                        id="xpack.fleet.agentActivityFlyout.reviewErrorLogs"
                        defaultMessage="Review error logs"
                      />
                    </EuiButton>
                  </RedirectAppLinks>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiAccordion>
    </>
  );
};
