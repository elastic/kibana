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
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';

interface LogsLinkToStreamProps {
  startTimestamp: number;
  endTimestamp: number;
  query: string;
}

export const LogsLinkToStream = ({
  startTimestamp,
  endTimestamp,
  query,
}: LogsLinkToStreamProps) => {
  const { services } = useKibanaContextForPlugin();
  const { http } = services;

  const viewInLogsUrl = useMemo(
    () =>
      http.basePath.prepend(
        url.format({
          pathname: '/app/logs/stream',
          search: stringify({
            logPosition: encode({
              start: new Date(startTimestamp),
              end: new Date(endTimestamp),
              streamLive: false,
            }),
            logFilter: encode({
              kind: 'kuery',
              expression: query,
            }),
          }),
        })
      ),
    [http.basePath, startTimestamp, endTimestamp, query]
  );

  return (
    <RedirectAppLinks coreStart={services}>
      <EuiButtonEmpty
        href={viewInLogsUrl}
        data-test-subj="hostsView-logs-link-to-stream-button"
        iconType="popout"
        flush="both"
      >
        <FormattedMessage
          id="xpack.infra.hostsViewPage.tabs.logs.openInLogsUiLinkText"
          defaultMessage="Open in Logs"
        />
      </EuiButtonEmpty>
    </RedirectAppLinks>
  );
};
