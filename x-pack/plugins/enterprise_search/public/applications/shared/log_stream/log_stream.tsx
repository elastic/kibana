/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { LogStream, LogStreamProps } from '@kbn/logs-shared-plugin/public';

/*
 * EnterpriseSearchLogStream is a light wrapper on top of logsShared's embeddable LogStream component.
 * It prepopulates our log source ID (set in server/plugin.ts) and sets a basic 24-hours-ago
 * default for timestamps. All other props get passed as-is to the underlying LogStream.
 *
 * Documentation links for reference:
 * - https://github.com/elastic/kibana/blob/main/x-pack/plugins/observability_solution/logs_shared/public/components/log_stream/log_stream.stories.mdx
 * - Run `yarn storybook logsShared` for live docs
 */

interface Props extends Omit<LogStreamProps, 'startTimestamp' | 'endTimestamp'> {
  startTimestamp?: LogStreamProps['startTimestamp'];
  endTimestamp?: LogStreamProps['endTimestamp'];
  hoursAgo?: number;
}

export const EntSearchLogStream: React.FC<Props> = ({
  startTimestamp,
  endTimestamp,
  hoursAgo = 24,
  ...props
}) => {
  if (!endTimestamp) endTimestamp = Date.now();
  if (!startTimestamp) startTimestamp = endTimestamp - hoursAgo * 60 * 60 * 1000;

  return (
    <EuiThemeProvider>
      <LogStream startTimestamp={startTimestamp} endTimestamp={endTimestamp} {...props} />
    </EuiThemeProvider>
  );
};
