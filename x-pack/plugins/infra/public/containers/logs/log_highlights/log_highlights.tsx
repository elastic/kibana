/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useState, useContext } from 'react';
import useThrottle from 'react-use/lib/useThrottle';
import { useLogEntryHighlights } from './log_entry_highlights';
import { useLogSummaryHighlights } from './log_summary_highlights';
import { useNextAndPrevious } from './next_and_previous';
import { LogPositionState } from '../log_position';
import { TimeKey } from '../../../../common/time';

const FETCH_THROTTLE_INTERVAL = 3000;

interface UseLogHighlightsStateProps {
  sourceId: string;
  sourceVersion: string | undefined;
  centerCursor: TimeKey | null;
  size: number;
  filterQuery: string | null;
}

export const useLogHighlightsState = ({
  sourceId,
  sourceVersion,
  centerCursor,
  size,
  filterQuery,
}: UseLogHighlightsStateProps) => {
  const [highlightTerms, setHighlightTerms] = useState<string[]>([]);
  const { visibleMidpoint, jumpToTargetPosition, startTimestamp, endTimestamp } = useContext(
    LogPositionState.Context
  );

  const throttledStartTimestamp = useThrottle(startTimestamp, FETCH_THROTTLE_INTERVAL);
  const throttledEndTimestamp = useThrottle(endTimestamp, FETCH_THROTTLE_INTERVAL);

  const {
    logEntryHighlights,
    logEntryHighlightsById,
    loadLogEntryHighlightsRequest,
  } = useLogEntryHighlights(
    sourceId,
    sourceVersion,
    throttledStartTimestamp,
    throttledEndTimestamp,
    centerCursor,
    size,
    filterQuery,
    highlightTerms
  );

  const { logSummaryHighlights, loadLogSummaryHighlightsRequest } = useLogSummaryHighlights(
    sourceId,
    sourceVersion,
    throttledStartTimestamp,
    throttledEndTimestamp,
    filterQuery,
    highlightTerms
  );

  const {
    currentHighlightKey,
    hasPreviousHighlight,
    hasNextHighlight,
    goToPreviousHighlight,
    goToNextHighlight,
  } = useNextAndPrevious({
    visibleMidpoint,
    logEntryHighlights,
    highlightTerms,
    jumpToTargetPosition,
  });

  return {
    highlightTerms,
    setHighlightTerms,
    logEntryHighlights,
    logEntryHighlightsById,
    logSummaryHighlights,
    loadLogEntryHighlightsRequest,
    loadLogSummaryHighlightsRequest,
    currentHighlightKey,
    hasPreviousHighlight,
    hasNextHighlight,
    goToPreviousHighlight,
    goToNextHighlight,
  };
};

export const LogHighlightsState = createContainer(useLogHighlightsState);
