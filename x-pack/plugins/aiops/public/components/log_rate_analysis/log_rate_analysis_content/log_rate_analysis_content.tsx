/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, type FC } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiHorizontalRule, EuiPanel } from '@elastic/eui';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { BarStyleAccessor } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';

import { FormattedMessage } from '@kbn/i18n-react';
import {
  getWindowParametersForTrigger,
  getSnappedTimestamps,
  getSnappedWindowParameters,
  LOG_RATE_ANALYSIS_HIGHLIGHT_COLOR,
  LOG_RATE_ANALYSIS_TYPE,
  type WindowParameters,
} from '@kbn/aiops-log-rate-analysis';
import {
  clearAllRowState,
  clearSelection,
  setAutoRunAnalysis,
  setInitialAnalysisStart,
  useAppDispatch,
  useAppSelector,
} from '@kbn/aiops-log-rate-analysis/state';

import { DocumentCountContent } from '../../document_count_content/document_count_content';
import {
  LogRateAnalysisResults,
  type LogRateAnalysisResultsData,
} from '../log_rate_analysis_results';

export const DEFAULT_SEARCH_QUERY: estypes.QueryDslQueryContainer = { match_all: {} };
const DEFAULT_SEARCH_BAR_QUERY: estypes.QueryDslQueryContainer = {
  bool: {
    filter: [],
    must: [
      {
        match_all: {},
      },
    ],
    must_not: [],
  },
};

export interface LogRateAnalysisContentProps {
  /** Elasticsearch query to pass to analysis endpoint */
  esSearchQuery?: estypes.QueryDslQueryContainer;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
  /** Optional callback that exposes data of the completed analysis */
  onAnalysisCompleted?: (d: LogRateAnalysisResultsData) => void;
  /** Optional callback that exposes current window parameters */
  onWindowParametersChange?: (wp?: WindowParameters, replace?: boolean) => void;
  /** Identifier to indicate the plugin utilizing the component */
  embeddingOrigin: string;
}

export const LogRateAnalysisContent: FC<LogRateAnalysisContentProps> = ({
  esSearchQuery = DEFAULT_SEARCH_QUERY,
  barColorOverride,
  barHighlightColorOverride,
  onAnalysisCompleted,
  onWindowParametersChange,
  embeddingOrigin,
}) => {
  const dispatch = useAppDispatch();

  const isRunning = useAppSelector((s) => s.logRateAnalysisStream.isRunning);
  const significantItems = useAppSelector((s) => s.logRateAnalysisResults.significantItems);
  const significantItemsGroups = useAppSelector(
    (s) => s.logRateAnalysisResults.significantItemsGroups
  );
  const loaded = useAppSelector((s) => s.logRateAnalysisResults.loaded);
  const analysisType = useAppSelector((s) => s.logRateAnalysis.analysisType);
  const windowParameters = useAppSelector((s) => s.logRateAnalysis.windowParameters);

  // Window parameters stored in the url state use this components
  // `initialAnalysisStart` prop to set the initial params restore from url state.
  // To avoid a loop with window parameters being passed around on load,
  // the following ref and useEffect are used to check wether it's safe to call
  // the `onWindowParametersChange` callback.
  const windowParametersTouched = useRef(false);
  useEffect(() => {
    // Don't continue if window parameters were not touched yet.
    // Because they can be reset to `undefined` at a later stage again when a user
    // clears the selections, we cannot rely solely on checking if they are
    // `undefined`, we need the additional ref to update on the first change.
    if (!windowParametersTouched.current && windowParameters === undefined) {
      return;
    }

    windowParametersTouched.current = true;

    if (onWindowParametersChange) {
      onWindowParametersChange(windowParameters, true);
    }
  }, [onWindowParametersChange, windowParameters]);

  // Checks if `esSearchQuery` is the default empty query passed on from the search bar
  // and if that's the case fall back to a simpler match all query.
  const searchQuery = useMemo(
    () => (isEqual(esSearchQuery, DEFAULT_SEARCH_BAR_QUERY) ? DEFAULT_SEARCH_QUERY : esSearchQuery),
    [esSearchQuery]
  );

  const { autoRunAnalysis, documentStats, earliest, latest, isBrushCleared } = useAppSelector(
    (s) => s.logRateAnalysis
  );

  const { documentCountStats } = documentStats;

  function clearSelectionHandler() {
    dispatch(clearSelection());
    dispatch(clearAllRowState());
  }

  const barStyle = {
    rect: {
      opacity: 1,
      fill: LOG_RATE_ANALYSIS_HIGHLIGHT_COLOR,
    },
  };

  // Used to highlight an auto-detected change point in the date histogram.
  const barStyleAccessor: BarStyleAccessor | undefined =
    isBrushCleared && documentCountStats?.changePoint
      ? (d, g) => {
          return g.specId === 'document_count' &&
            documentCountStats?.changePoint &&
            d.x > documentCountStats.changePoint.startTs &&
            d.x < documentCountStats.changePoint.endTs
            ? barStyle
            : null;
        }
      : undefined;

  const triggerAnalysisForManualSelection = useCallback(() => {
    dispatch(setAutoRunAnalysis(true));
  }, [dispatch]);

  const triggerAnalysisForChangePoint = useCallback(() => {
    if (documentCountStats) {
      const { interval, timeRangeEarliest, timeRangeLatest, changePoint } = documentCountStats;

      if (changePoint && interval && timeRangeEarliest && timeRangeLatest) {
        const wp = getWindowParametersForTrigger(
          changePoint.startTs,
          interval,
          timeRangeEarliest,
          timeRangeLatest,
          changePoint
        );

        const snapTimestamps = getSnappedTimestamps(timeRangeEarliest, timeRangeLatest, interval);
        const wpSnap = getSnappedWindowParameters(wp, snapTimestamps);

        triggerAnalysisForManualSelection();
        dispatch(setInitialAnalysisStart(wpSnap));
      }
    }
  }, [documentCountStats, dispatch, triggerAnalysisForManualSelection]);

  useEffect(() => {
    if (!isRunning && loaded === 1 && onAnalysisCompleted) {
      onAnalysisCompleted({
        analysisType,
        significantItems,
        significantItemsGroups,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, loaded]);

  const showDocumentCountContent = documentCountStats !== undefined;

  const showLogRateAnalysisResults =
    autoRunAnalysis &&
    earliest !== undefined &&
    latest !== undefined &&
    windowParameters !== undefined;

  const showNoAutoRunEmptyPrompt =
    !autoRunAnalysis &&
    earliest !== undefined &&
    latest !== undefined &&
    windowParameters !== undefined;

  const showSpikeDetectedEmptyPrompt =
    windowParameters === undefined && documentCountStats?.changePoint;

  const showDefaultEmptyPrompt =
    windowParameters === undefined && documentCountStats?.changePoint === undefined;

  const changePointType = documentCountStats?.changePoint?.type;

  return (
    <EuiPanel hasBorder={false} hasShadow={false}>
      {showDocumentCountContent && (
        <DocumentCountContent
          barColorOverride={barColorOverride}
          barHighlightColorOverride={barHighlightColorOverride}
          barStyleAccessor={barStyleAccessor}
        />
      )}
      <EuiHorizontalRule />
      {showLogRateAnalysisResults && (
        <LogRateAnalysisResults
          onReset={clearSelectionHandler}
          searchQuery={searchQuery}
          barColorOverride={barColorOverride}
          barHighlightColorOverride={barHighlightColorOverride}
          embeddingOrigin={embeddingOrigin}
        />
      )}
      {showNoAutoRunEmptyPrompt && (
        <EuiEmptyPrompt
          color="subdued"
          hasShadow={false}
          hasBorder={false}
          css={{ minWidth: '100%' }}
          title={undefined}
          titleSize="xs"
          body={
            <>
              <p>
                <FormattedMessage
                  id="xpack.aiops.logRateAnalysis.page.noAutoRunPromptBody"
                  defaultMessage="Next you can fine tune the time ranges for baseline and deviation by dragging the handles of the brushes. Once you're ready, click the button 'Run analysis' below."
                />
              </p>
              <EuiButton
                data-test-subj="aiopsLogRateAnalysisNoAutoRunContentRunAnalysisButton"
                onClick={triggerAnalysisForManualSelection}
              >
                <FormattedMessage
                  id="xpack.aiops.logRateAnalysis.page.noAutoRunPromptRunAnalysisButton"
                  defaultMessage="Run analysis"
                />
              </EuiButton>{' '}
              <EuiButton
                data-test-subj="aiopsClearSelectionBadge"
                onClick={() => clearSelectionHandler()}
                color="text"
              >
                <FormattedMessage
                  id="xpack.aiops.clearSelectionLabel"
                  defaultMessage="Clear selection"
                />
              </EuiButton>
            </>
          }
          data-test-subj="aiopsChangePointDetectedPrompt"
        />
      )}
      {showSpikeDetectedEmptyPrompt && (
        <EuiEmptyPrompt
          color="subdued"
          hasShadow={false}
          hasBorder={false}
          css={{ minWidth: '100%' }}
          title={
            <h2>
              {changePointType === LOG_RATE_ANALYSIS_TYPE.SPIKE && (
                <FormattedMessage
                  id="xpack.aiops.logRateAnalysis.page.changePointSpikePromptTitle"
                  defaultMessage="Log rate spike detected"
                />
              )}
              {changePointType === LOG_RATE_ANALYSIS_TYPE.DIP && (
                <FormattedMessage
                  id="xpack.aiops.logRateAnalysis.page.changePointDipPromptTitle"
                  defaultMessage="Log rate dip detected"
                />
              )}
              {changePointType !== LOG_RATE_ANALYSIS_TYPE.SPIKE &&
                changePointType !== LOG_RATE_ANALYSIS_TYPE.DIP && (
                  <FormattedMessage
                    id="xpack.aiops.logRateAnalysis.page.changePointOtherPromptTitle"
                    defaultMessage="Log rate change point detected"
                  />
                )}
            </h2>
          }
          titleSize="xs"
          body={
            <>
              <p>
                <FormattedMessage
                  id="xpack.aiops.logRateAnalysis.page.changePointPromptBody"
                  defaultMessage="The log rate analysis feature identifies statistically significant field/value combinations that contribute to a log rate spike or dip. To analyse the area highlighted in the chart, click the button below. For custom analysis of other areas, start by clicking on any of the non-highlighted bars in the histogram chart."
                />
              </p>
              <EuiButton
                data-test-subj="aiopsLogRateAnalysisContentRunAnalysisButton"
                onClick={triggerAnalysisForChangePoint}
              >
                <FormattedMessage
                  id="xpack.aiops.logRateAnalysis.page.changePointPromptRunAnalysisButton"
                  defaultMessage="Run analysis"
                />
              </EuiButton>
            </>
          }
          data-test-subj="aiopsChangePointDetectedPrompt"
        />
      )}
      {showDocumentCountContent && showDefaultEmptyPrompt && (
        <EuiEmptyPrompt
          color="subdued"
          hasShadow={false}
          hasBorder={false}
          css={{ minWidth: '100%' }}
          title={
            <h2>
              <FormattedMessage
                id="xpack.aiops.logRateAnalysis.page.emptyPromptTitle"
                defaultMessage="Start by clicking a spike or dip in the histogram chart."
              />
            </h2>
          }
          titleSize="xs"
          body={
            <p>
              <FormattedMessage
                id="xpack.aiops.logRateAnalysis.page.emptyPromptBody"
                defaultMessage="The log rate analysis feature identifies statistically significant field/value combinations that contribute to a log rate spike or dip."
              />
            </p>
          }
          data-test-subj="aiopsNoWindowParametersEmptyPrompt"
        />
      )}
    </EuiPanel>
  );
};
