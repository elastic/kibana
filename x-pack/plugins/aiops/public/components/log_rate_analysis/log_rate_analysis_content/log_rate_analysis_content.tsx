/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import type { Moment } from 'moment';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { BarStyleAccessor } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  getWindowParametersForTrigger,
  getSnappedTimestamps,
  getSnappedWindowParameters,
  LOG_RATE_ANALYSIS_HIGHLIGHT_COLOR,
  LOG_RATE_ANALYSIS_TYPE,
  type LogRateAnalysisType,
  type WindowParameters,
} from '@kbn/aiops-log-rate-analysis';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import { useLogRateAnalysisStateContext, type GroupTableItem } from '@kbn/aiops-components';

import { useData } from '../../../hooks/use_data';
import { useDataSource } from '../../../hooks/use_data_source';

import { DocumentCountContent } from '../../document_count_content/document_count_content';
import {
  LogRateAnalysisResults,
  type LogRateAnalysisResultsData,
} from '../log_rate_analysis_results';

const DEFAULT_SEARCH_QUERY: estypes.QueryDslQueryContainer = { match_all: {} };
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

export function getDocumentCountStatsSplitLabel(
  significantItem?: SignificantItem,
  group?: GroupTableItem
) {
  if (significantItem) {
    return `${significantItem?.fieldName}:${significantItem?.fieldValue}`;
  } else if (group) {
    return i18n.translate('xpack.aiops.logRateAnalysis.page.documentCountStatsSplitGroupLabel', {
      defaultMessage: 'Selected group',
    });
  }
}

export interface LogRateAnalysisContentProps {
  /** Optional time range override */
  timeRange?: { min: Moment; max: Moment };
  /** Elasticsearch query to pass to analysis endpoint */
  esSearchQuery?: estypes.QueryDslQueryContainer;
  /** Option to make the main histogram sticky */
  stickyHistogram?: boolean;
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
  timeRange,
  esSearchQuery = DEFAULT_SEARCH_QUERY,
  stickyHistogram,
  barColorOverride,
  barHighlightColorOverride,
  onAnalysisCompleted,
  onWindowParametersChange,
  embeddingOrigin,
}) => {
  const { dataView } = useDataSource();

  const [windowParameters, setWindowParameters] = useState<WindowParameters | undefined>();
  const [isBrushCleared, setIsBrushCleared] = useState(true);
  const [logRateAnalysisType, setLogRateAnalysisType] = useState<LogRateAnalysisType>(
    LOG_RATE_ANALYSIS_TYPE.SPIKE
  );

  useEffect(() => {
    setIsBrushCleared(windowParameters === undefined);
  }, [windowParameters]);

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

  const {
    autoRunAnalysis,
    currentSelectedSignificantItem,
    currentSelectedGroup,
    setAutoRunAnalysis,
    setInitialAnalysisStart,
    setPinnedSignificantItem,
    setPinnedGroup,
    setSelectedSignificantItem,
    setSelectedGroup,
  } = useLogRateAnalysisStateContext();

  const { documentStats, earliest, latest } = useData(
    dataView,
    'log_rate_analysis',
    searchQuery,
    undefined,
    currentSelectedSignificantItem,
    currentSelectedGroup,
    undefined,
    true,
    timeRange
  );

  const { sampleProbability, totalCount, documentCountStats, documentCountStatsCompare } =
    documentStats;

  function brushSelectionUpdate(
    windowParametersUpdate: WindowParameters,
    force: boolean,
    logRateAnalysisTypeUpdate: LogRateAnalysisType
  ) {
    if (!isBrushCleared || force) {
      setWindowParameters(windowParametersUpdate);
    }
    if (force) {
      setIsBrushCleared(false);
    }
    setLogRateAnalysisType(logRateAnalysisTypeUpdate);
  }

  function clearSelection() {
    setWindowParameters(undefined);
    setPinnedSignificantItem(null);
    setPinnedGroup(null);
    setSelectedSignificantItem(null);
    setSelectedGroup(null);
    setIsBrushCleared(true);
    setInitialAnalysisStart(undefined);
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
    setAutoRunAnalysis(true);
  }, [setAutoRunAnalysis]);

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
        setInitialAnalysisStart(wpSnap);
      }
    }
  }, [documentCountStats, setInitialAnalysisStart, triggerAnalysisForManualSelection]);

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
          brushSelectionUpdateHandler={brushSelectionUpdate}
          documentCountStats={documentCountStats}
          documentCountStatsSplit={documentCountStatsCompare}
          documentCountStatsSplitLabel={getDocumentCountStatsSplitLabel(
            currentSelectedSignificantItem,
            currentSelectedGroup
          )}
          isBrushCleared={isBrushCleared}
          totalCount={totalCount}
          sampleProbability={sampleProbability}
          barColorOverride={barColorOverride}
          barHighlightColorOverride={barHighlightColorOverride}
          barStyleAccessor={barStyleAccessor}
        />
      )}
      <EuiHorizontalRule />
      {showLogRateAnalysisResults && (
        <LogRateAnalysisResults
          analysisType={logRateAnalysisType}
          earliest={earliest}
          isBrushCleared={isBrushCleared}
          latest={latest}
          stickyHistogram={stickyHistogram}
          onReset={clearSelection}
          sampleProbability={sampleProbability}
          searchQuery={searchQuery}
          windowParameters={windowParameters}
          barColorOverride={barColorOverride}
          barHighlightColorOverride={barHighlightColorOverride}
          onAnalysisCompleted={onAnalysisCompleted}
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
                onClick={() => clearSelection()}
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
      {showDefaultEmptyPrompt && (
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
