/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, type FC } from 'react';
import { EuiEmptyPrompt, EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import type { Moment } from 'moment';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Dictionary } from '@kbn/ml-url-state';
import {
  LOG_RATE_ANALYSIS_TYPE,
  type LogRateAnalysisType,
  type WindowParameters,
} from '@kbn/aiops-utils';
import type { SignificantTerm } from '@kbn/ml-agg-utils';

import { useData } from '../../../hooks/use_data';

import { DocumentCountContent } from '../../document_count_content/document_count_content';
import {
  LogRateAnalysisResults,
  type LogRateAnalysisResultsData,
} from '../log_rate_analysis_results';
import type { GroupTableItem } from '../../log_rate_analysis_results_table/types';
import { useLogRateAnalysisResultsTableRowContext } from '../../log_rate_analysis_results_table/log_rate_analysis_results_table_row_provider';

const DEFAULT_SEARCH_QUERY = { match_all: {} };

export function getDocumentCountStatsSplitLabel(
  significantTerm?: SignificantTerm,
  group?: GroupTableItem
) {
  if (significantTerm) {
    return `${significantTerm?.fieldName}:${significantTerm?.fieldValue}`;
  } else if (group) {
    return i18n.translate('xpack.aiops.logRateAnalysis.page.documentCountStatsSplitGroupLabel', {
      defaultMessage: 'Selected group',
    });
  }
}

export interface LogRateAnalysisContentProps {
  /** The data view to analyze. */
  dataView: DataView;
  setGlobalState?: (params: Dictionary<unknown>) => void;
  /** Timestamp for the start of the range for initial analysis */
  initialAnalysisStart?: number | WindowParameters;
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
}

export const LogRateAnalysisContent: FC<LogRateAnalysisContentProps> = ({
  dataView,
  setGlobalState,
  initialAnalysisStart: incomingInitialAnalysisStart,
  timeRange,
  esSearchQuery = DEFAULT_SEARCH_QUERY,
  stickyHistogram,
  barColorOverride,
  barHighlightColorOverride,
  onAnalysisCompleted,
}) => {
  const [windowParameters, setWindowParameters] = useState<WindowParameters | undefined>();
  const [initialAnalysisStart, setInitialAnalysisStart] = useState<
    number | WindowParameters | undefined
  >(incomingInitialAnalysisStart);
  const [isBrushCleared, setIsBrushCleared] = useState(true);
  const [logRateAnalysisType, setLogRateAnalysisType] = useState<LogRateAnalysisType>(
    LOG_RATE_ANALYSIS_TYPE.SPIKE
  );

  useEffect(() => {
    setIsBrushCleared(windowParameters === undefined);
  }, [windowParameters]);

  const {
    currentSelectedSignificantTerm,
    currentSelectedGroup,
    setPinnedSignificantTerm,
    setPinnedGroup,
    setSelectedSignificantTerm,
    setSelectedGroup,
  } = useLogRateAnalysisResultsTableRowContext();

  const { documentStats, earliest, latest } = useData(
    dataView,
    'log_rate_analysis',
    esSearchQuery,
    setGlobalState,
    currentSelectedSignificantTerm,
    currentSelectedGroup,
    undefined,
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
    setPinnedSignificantTerm(null);
    setPinnedGroup(null);
    setSelectedSignificantTerm(null);
    setSelectedGroup(null);
    setIsBrushCleared(true);
    setInitialAnalysisStart(undefined);
  }

  return (
    <EuiPanel hasBorder={false} hasShadow={false}>
      {documentCountStats !== undefined && (
        <DocumentCountContent
          brushSelectionUpdateHandler={brushSelectionUpdate}
          documentCountStats={documentCountStats}
          documentCountStatsSplit={documentCountStatsCompare}
          documentCountStatsSplitLabel={getDocumentCountStatsSplitLabel(
            currentSelectedSignificantTerm,
            currentSelectedGroup
          )}
          isBrushCleared={isBrushCleared}
          totalCount={totalCount}
          sampleProbability={sampleProbability}
          initialAnalysisStart={initialAnalysisStart}
          barColorOverride={barColorOverride}
          barHighlightColorOverride={barHighlightColorOverride}
        />
      )}
      <EuiHorizontalRule />
      {earliest !== undefined && latest !== undefined && windowParameters !== undefined && (
        <LogRateAnalysisResults
          dataView={dataView}
          analysisType={logRateAnalysisType}
          earliest={earliest}
          isBrushCleared={isBrushCleared}
          latest={latest}
          stickyHistogram={stickyHistogram}
          onReset={clearSelection}
          sampleProbability={sampleProbability}
          searchQuery={esSearchQuery}
          windowParameters={windowParameters}
          barColorOverride={barColorOverride}
          barHighlightColorOverride={barHighlightColorOverride}
          onAnalysisCompleted={onAnalysisCompleted}
        />
      )}
      {windowParameters === undefined && (
        <EuiEmptyPrompt
          color="subdued"
          hasShadow={false}
          hasBorder={false}
          css={{ minWidth: '100%' }}
          title={
            <h2>
              <FormattedMessage
                id="xpack.aiops.logRateAnalysis.page.emptyPromptTitle"
                defaultMessage="Click a spike or dip in the histogram chart to start the analysis."
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
