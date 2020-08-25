/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { noop } from 'lodash';
import { EuiPanel } from '@elastic/eui';
import { useLogStream } from '../../containers/logs/log_stream';
import { ScrollableLogTextStreamView } from '../logging/log_text_stream';

interface LogStreamProps {
  startTimestamp: number;
  endTimestamp: number;
}

export const LogStream: React.FC<LogStreamProps> = ({ startTimestamp, endTimestamp }) => {
  const { entries, fetchEntries } = useLogStream({ startTimestamp, endTimestamp });

  useEffect(() => fetchEntries(), [fetchEntries]);

  return (
    <EuiPanel>
      <ScrollableLogTextStreamView
        target={null}
        columnConfigurations={[]}
        items={entries}
        scale="medium"
        wrap={false}
        isReloading={false}
        isLoadingMore={false}
        hasMoreBeforeStart={false}
        hasMoreAfterEnd={false}
        isStreaming={false}
        lastLoadedTime={null}
        jumpToTarget={noop}
        reportVisibleInterval={noop}
        loadNewerItems={noop}
        reloadItems={fetchEntries}
        highlightedItem={null}
        currentHighlightKey={null}
        startDateExpression={''}
        endDateExpression={''}
        updateDateRange={noop}
        startLiveStreaming={noop}
      />
    </EuiPanel>
  );
};
