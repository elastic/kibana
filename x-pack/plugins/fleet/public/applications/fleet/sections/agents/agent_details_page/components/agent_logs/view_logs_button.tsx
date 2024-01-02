/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { stringify } from 'querystring';

import React, { useMemo } from 'react';
import { encode } from '@kbn/rison';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useStartServices } from '../../../../../hooks';

interface ViewLogsProps {
  viewInLogs: boolean;
  logStreamQuery: string;
  startTime: string;
  endTime: string;
}

/*
  Button that takes to the Logs view Ui when that is available, otherwise fallback to the Discover UI
  The urls are built using same logStreamQuery (provided by a prop), startTime and endTime, ensuring that they'll both will target same log lines
*/
export const ViewLogsButton: React.FunctionComponent<ViewLogsProps> = ({
  viewInLogs,
  logStreamQuery,
  startTime,
  endTime,
}) => {
  const { http } = useStartServices();

  // Generate URL to pass page state to Logs UI
  const viewInLogsUrl = useMemo(
    () =>
      http.basePath.prepend(
        url.format({
          pathname: '/app/logs/stream',
          search: stringify({
            logPosition: encode({
              start: startTime,
              end: endTime,
              streamLive: false,
            }),
            logFilter: encode({
              expression: logStreamQuery,
              kind: 'kuery',
            }),
          }),
        })
      ),
    [http.basePath, startTime, endTime, logStreamQuery]
  );

  const viewInDiscoverUrl = useMemo(() => {
    const index = 'logs-*';
    const query = encode({
      query: logStreamQuery,
      language: 'kuery',
    });
    return http.basePath.prepend(
      `/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:'${startTime}',to:'${endTime}'))&_a=(columns:!(event.dataset,message),index:'${index}',query:${query})`
    );
  }, [logStreamQuery, http.basePath, startTime, endTime]);

  return viewInLogs ? (
    <EuiButton href={viewInLogsUrl} iconType="popout" data-test-subj="viewInLogsBtn">
      <FormattedMessage
        id="xpack.fleet.agentLogs.openInLogsUiLinkText"
        defaultMessage="Open in Logs"
      />
    </EuiButton>
  ) : (
    <EuiButton href={viewInDiscoverUrl} iconType="popout" data-test-subj="viewInDiscoverBtn">
      <FormattedMessage
        id="xpack.fleet.agentLogs.openInDiscoverUiLinkText"
        defaultMessage="Open in Discover"
      />
    </EuiButton>
  );
};
