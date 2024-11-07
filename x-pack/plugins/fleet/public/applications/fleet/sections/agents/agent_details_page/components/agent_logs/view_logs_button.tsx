/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { getLogsLocatorsFromUrlService } from '@kbn/logs-shared-plugin/common';

import moment from 'moment';

import { EuiButton } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { useStartServices, useAuthz } from '../../../../../hooks';

interface ViewLogsProps {
  logStreamQuery: string;
  startTime: number;
  endTime: number;
}

export const getFormattedRange = (date: string) => new Date(date).getTime();

/*
  Button that takes to the Logs view UI or the Discover logs, depending on what's available
  If none is available, don't display the button at all
*/
export const ViewLogsButton: React.FunctionComponent<ViewLogsProps> = ({
  logStreamQuery,
  startTime,
  endTime,
}) => {
  const { share } = useStartServices();
  const { logsLocator } = getLogsLocatorsFromUrlService(share.url);
  const authz = useAuthz();

  const logsUrl = useMemo(() => {
    const now = moment().toISOString();
    const oneDayAgo = moment().subtract(1, 'day').toISOString();
    const defaultStartTime = getFormattedRange(oneDayAgo);
    const defaultEndTime = getFormattedRange(now);

    return logsLocator.getRedirectUrl({
      time: endTime ? endTime : defaultEndTime,
      timeRange: {
        startTime: startTime ? startTime : defaultStartTime,
        endTime: endTime ? endTime : defaultEndTime,
      },
      filter: logStreamQuery,
    });
  }, [endTime, logStreamQuery, logsLocator, startTime]);

  return authz.fleet.readAgents && logsLocator ? (
    <EuiButton href={logsUrl} iconType="popout" data-test-subj="viewInLogsBtn">
      <FormattedMessage
        id="xpack.fleet.agentLogs.openInLogsUiLinkText"
        defaultMessage="Open in Logs Explorer"
      />
    </EuiButton>
  ) : null;
};
