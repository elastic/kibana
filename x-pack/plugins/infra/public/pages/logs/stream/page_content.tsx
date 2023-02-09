/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useActor } from '@xstate/react';
import React from 'react';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import {
  LogStreamPageState,
  useLogStreamPageStateContext,
} from '../../../observability_logs/log_stream_page/state';
import { InvalidStateCallout } from '../../../observability_logs/xstate_helpers';
import { ConnectedLogViewErrorPage } from '../shared/page_log_view_error';
import { StreamPageLogsContentForState } from './page_logs_content';
import { StreamPageMissingIndicesContent } from './page_missing_indices_content';
import { LogStreamPageContentProviders } from './page_providers';

export const ConnectedStreamPageContent: React.FC = () => {
  const logStreamPageStateService = useLogStreamPageStateContext();

  const [logStreamPageState] = useActor(logStreamPageStateService);

  return <StreamPageContentForState logStreamPageState={logStreamPageState} />;
};

export const StreamPageContentForState: React.FC<{ logStreamPageState: LogStreamPageState }> = ({
  logStreamPageState,
}) => {
  if (logStreamPageState.matches('uninitialized') || logStreamPageState.matches('loadingLogView')) {
    return <SourceLoadingPage />;
  } else if (logStreamPageState.matches('loadingLogViewFailed')) {
    return <ConnectedLogViewErrorPage />;
  } else if (logStreamPageState.matches('missingLogViewIndices')) {
    return <StreamPageMissingIndicesContent />;
  } else if (logStreamPageState.matches({ hasLogViewIndices: 'initialized' })) {
    return (
      <LogStreamPageContentProviders logStreamPageState={logStreamPageState}>
        <StreamPageLogsContentForState logStreamPageState={logStreamPageState} />
      </LogStreamPageContentProviders>
    );
  } else {
    return <InvalidStateCallout state={logStreamPageState} />;
  }
};
