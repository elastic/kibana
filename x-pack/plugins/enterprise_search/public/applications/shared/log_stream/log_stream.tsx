/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { LogStream, LogStreamProps } from '../../../../../infra/public';

import { LOGS_SOURCE_ID } from '../../../../common/constants';

/*
 * EnterpriseSearchLogStream is a light wrapper on top of infra's embeddable LogStream component.
 * It prepopulates our log source ID (set in server/plugin.ts) and sets a basic 24-hours-ago
 * default for timestamps. All other props get passed as-is to the underlying LogStream.
 *
 * Documentation links for reference:
 * - https://github.com/elastic/kibana/blob/main/x-pack/plugins/infra/public/components/log_stream/log_stream.stories.mdx
 * - Run `yarn storybook infra` for live docs
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
    <LogStream
      sourceId={LOGS_SOURCE_ID}
      startTimestamp={startTimestamp}
      endTimestamp={endTimestamp}
      {...props}
    />
  );
};
