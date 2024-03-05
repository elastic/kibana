/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange } from '@kbn/es-query';
import { useActor } from '@xstate/react';
import React, { useMemo } from 'react';
import { VisiblePositions } from '../../../observability_logs/log_stream_position_state';
import { TimeKey } from '../../../../common/time';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import {
  LogStreamPageCallbacks,
  LogStreamPageState,
  useLogStreamPageStateContext,
} from '../../../observability_logs/log_stream_page/state';
import { InvalidStateCallout } from '../../../observability_logs/xstate_helpers';
import { ConnectedLogViewErrorPage } from '../shared/page_log_view_error';
import { LogStreamPageTemplate } from './components/stream_page_template';
import { StreamPageLogsContentForState } from './page_logs_content';
import { StreamPageMissingIndicesContent } from './page_missing_indices_content';
import { LogStreamPageContentProviders } from './page_providers';

export const ConnectedStreamPageContent: React.FC = () => {
  const logStreamPageStateService = useLogStreamPageStateContext();
  const [logStreamPageState, logStreamPageSend] = useActor(logStreamPageStateService);

  const pageStateCallbacks = useMemo(() => {
    return {
      updateTimeRange: (timeRange: Partial<TimeRange>) => {
        logStreamPageSend({
          type: 'UPDATE_TIME_RANGE',
          timeRange,
        });
      },
      jumpToTargetPosition: (targetPosition: TimeKey | null) => {
        logStreamPageSend({ type: 'JUMP_TO_TARGET_POSITION', targetPosition });
      },
      jumpToTargetPositionTime: (time: string) => {
        logStreamPageSend({ type: 'JUMP_TO_TARGET_POSITION', targetPosition: { time } });
      },
      reportVisiblePositions: (visiblePositions: VisiblePositions) => {
        logStreamPageSend({
          type: 'REPORT_VISIBLE_POSITIONS',
          visiblePositions,
        });
      },
      startLiveStreaming: () => {
        logStreamPageSend({ type: 'UPDATE_REFRESH_INTERVAL', refreshInterval: { pause: false } });
      },
      stopLiveStreaming: () => {
        logStreamPageSend({ type: 'UPDATE_REFRESH_INTERVAL', refreshInterval: { pause: true } });
      },
    };
  }, [logStreamPageSend]);

  return (
    <StreamPageContentForState
      logStreamPageState={logStreamPageState}
      logStreamPageCallbacks={pageStateCallbacks}
    />
  );
};

export const StreamPageContentForState: React.FC<{
  logStreamPageState: LogStreamPageState;
  logStreamPageCallbacks: LogStreamPageCallbacks;
}> = ({ logStreamPageState, logStreamPageCallbacks }) => {
  if (
    logStreamPageState.matches('uninitialized') ||
    logStreamPageState.matches({ hasLogViewIndices: 'uninitialized' }) ||
    logStreamPageState.matches('loadingLogView')
  ) {
    return <SourceLoadingPage />;
  } else if (logStreamPageState.matches('loadingLogViewFailed')) {
    return <ConnectedLogViewErrorPage />;
  } else if (logStreamPageState.matches('missingLogViewIndices')) {
    return <StreamPageMissingIndicesContent />;
  } else if (logStreamPageState.matches({ hasLogViewIndices: 'initialized' })) {
    return (
      <LogStreamPageTemplate hasData={true} isDataLoading={false}>
        <LogStreamPageContentProviders
          logStreamPageState={logStreamPageState}
          logStreamPageCallbacks={logStreamPageCallbacks}
        >
          <StreamPageLogsContentForState
            logStreamPageState={logStreamPageState}
            logStreamPageCallbacks={logStreamPageCallbacks}
          />
        </LogStreamPageContentProviders>
      </LogStreamPageTemplate>
    );
  } else {
    return <InvalidStateCallout state={logStreamPageState} />;
  }
};
