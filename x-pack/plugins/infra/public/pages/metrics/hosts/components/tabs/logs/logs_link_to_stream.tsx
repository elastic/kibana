/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';

interface LogsLinkToStreamProps {
  startTime: number;
  endTime: number;
  query: string;
}

export const LogsLinkToStream = ({ startTime, endTime, query }: LogsLinkToStreamProps) => {
  const { services } = useKibanaContextForPlugin();
  const { locators } = services;

  return (
    <RedirectAppLinks coreStart={services}>
      <EuiButtonEmpty
        href={locators.logsLocator?.getRedirectUrl({
          time: endTime,
          timeRange: {
            startTime,
            endTime,
          },
          filter: query,
        })}
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
