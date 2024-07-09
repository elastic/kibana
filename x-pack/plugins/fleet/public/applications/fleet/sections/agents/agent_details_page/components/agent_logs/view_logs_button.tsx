/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import moment from 'moment';

import { useDiscoverLocator, useLogExplorerLocator } from '../../../../../hooks';

interface ViewLogsProps {
  logStreamQuery: string;
  startTime: string;
  endTime: string;
}

/*
  Button that takes to the Logs view Ui when that is available, otherwise fallback to the Discover UI
  If none is available, don't display the button at all
*/
//  TODO: check if it's possible to use `nodeLogsLocator` from `getLogsLocatorsFromUrlService` instead
export const ViewLogsButton: React.FunctionComponent<ViewLogsProps> = ({
  logStreamQuery,
  startTime,
  endTime,
}) => {
  const discoverLocator = useDiscoverLocator();
  const logsExplorerLocator = useLogExplorerLocator();
  const defaultStartTime = moment().subtract(1, 'day').toISOString();
  const defaultEndTime = moment().toISOString();

  const redirectUrlParams = useMemo(() => {
    return {
      timeRange: {
        from: startTime ? startTime : defaultStartTime,
        to: endTime ? endTime : defaultEndTime,
      },
      query: { query: logStreamQuery, language: 'kuery' },
    };
  }, [defaultEndTime, defaultStartTime, endTime, logStreamQuery, startTime]);

  const url = useMemo(() => {
    return logsExplorerLocator
      ? logsExplorerLocator?.getRedirectUrl(redirectUrlParams)
      : discoverLocator?.getRedirectUrl(redirectUrlParams);
  }, [discoverLocator, logsExplorerLocator, redirectUrlParams]);

  return logsExplorerLocator || discoverLocator ? (
    <EuiButton href={url} iconType="popout" data-test-subj="viewInLogsBtn">
      <FormattedMessage
        id="xpack.fleet.agentLogs.openInLogsUiLinkText"
        defaultMessage="Open in Logs"
      />
    </EuiButton>
  ) : null;
};
