/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogStreamPageTemplate } from './components/stream_page_template';
import { StreamPageLogsContent } from './page_logs_content';
import { LogHighlightsState } from './page_providers';
import { LogStreamPageActorRef } from '../../../observability_logs/log_stream_page/state';
import { MatchedStateFromActor } from '../../../observability_logs/xstate_helpers';

export const StreamPageLogs = React.memo<{
  logStreamPageState: InitializedLogStreamPageState;
}>(({ logStreamPageState }) => {
  const {
    context: { parsedQuery },
  } = logStreamPageState;
  return (
    <LogStreamPageTemplate hasData={true} isDataLoading={false}>
      <LogHighlightsState logStreamPageState={logStreamPageState}>
        <StreamPageLogsContent filterQuery={parsedQuery} />
      </LogHighlightsState>
    </LogStreamPageTemplate>
  );
});

type InitializedLogStreamPageState = MatchedStateFromActor<
  LogStreamPageActorRef,
  { hasLogViewIndices: 'initialized' }
>;

export const StreamPageLogsForState = React.memo<{
  logStreamPageState: InitializedLogStreamPageState;
}>(({ logStreamPageState }) => {
  return <StreamPageLogs logStreamPageState={logStreamPageState} />;
});
