/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, FC } from 'react';
import { isEqual, uniq } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  EuiButton,
  EuiButtonGroup,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/public';
import { ProgressControls } from '@kbn/aiops-components';
import { useFetchStream } from '@kbn/ml-response-stream/client';
import type { WindowParameters } from '@kbn/aiops-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SignificantTerm, SignificantTermGroup } from '@kbn/ml-agg-utils';

import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { initialState, streamReducer } from '../../../common/api/stream_reducer';
import type { AiopsApiLogRateAnalysis } from '../../../common/api';
import {
  getGroupTableItems,
  LogRateAnalysisResultsTable,
  LogRateAnalysisResultsGroupsTable,
} from '../log_rate_analysis_results_table';
import { useLogRateAnalysisResultsTableRowContext } from '../log_rate_analysis_results_table/log_rate_analysis_results_table_row_provider';

import { FieldFilterPopover } from './field_filter_popover';

const groupResultsMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.groupedSwitchLabel.groupResults',
  {
    defaultMessage: 'Smart grouping',
  }
);
const groupResultsHelpMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.groupedSwitchLabel.groupResultsHelpMessage',
  {
    defaultMessage: 'Items which are unique to a group are marked by an asterisk (*).',
  }
);
const groupResultsOffMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.groupedSwitchLabel.groupResultsOff',
  {
    defaultMessage: 'Off',
  }
);
const groupResultsOnMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.groupedSwitchLabel.groupResultsOn',
  {
    defaultMessage: 'On',
  }
);
const resultsGroupedOffId = 'aiopsLogRateAnalysisGroupingOff';
const resultsGroupedOnId = 'aiopsLogRateAnalysisGroupingOn';

export interface LogRateAnalysisResultsData {
  significantTerms: SignificantTerm[];
  significantTermsGroups: SignificantTermGroup[];
}

/**
 * LogRateAnalysis props require a data view.
 */
interface LogRateAnalysisResultsProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** Start timestamp filter */
  earliest: number;
  /** End timestamp filter */
  latest: number;
  isBrushCleared: boolean;
  /** Option to make main histogram sticky */
  stickyHistogram?: boolean;
  /** Callback for resetting the analysis */
  onReset: () => void;
  /** Window parameters for the analysis */
  windowParameters: WindowParameters;
  /** The search query to be applied to the analysis as a filter */
  searchQuery: estypes.QueryDslQueryContainer;
  /** Sample probability to be applied to random sampler aggregations */
  sampleProbability: number;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
  /** Optional callback that exposes data of the completed analysis */
  onAnalysisCompleted?: (d: LogRateAnalysisResultsData) => void;
}

export const LogRateAnalysisResults: FC<LogRateAnalysisResultsProps> = ({
  dataView,
  earliest,
  isBrushCleared,
  latest,
  stickyHistogram,
  onReset,
  windowParameters,
  searchQuery,
  sampleProbability,
  barColorOverride,
  barHighlightColorOverride,
  onAnalysisCompleted,
}) => {
  const { http } = useAiopsAppContext();

  const { clearAllRowState } = useLogRateAnalysisResultsTableRowContext();

  const [currentAnalysisWindowParameters, setCurrentAnalysisWindowParameters] = useState<
    WindowParameters | undefined
  >();
  const [groupResults, setGroupResults] = useState<boolean>(false);
  const [groupSkipFields, setGroupSkipFields] = useState<string[]>([]);
  const [uniqueFieldNames, setUniqueFieldNames] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<
    AiopsApiLogRateAnalysis['body']['overrides'] | undefined
  >(undefined);
  const [shouldStart, setShouldStart] = useState(false);
  const [toggleIdSelected, setToggleIdSelected] = useState(resultsGroupedOffId);

  const onGroupResultsToggle = (optionId: string) => {
    setToggleIdSelected(optionId);
    setGroupResults(optionId === resultsGroupedOnId);

    // When toggling the group switch, clear all row selections
    clearAllRowState();
  };

  const onFieldsFilterChange = (skippedFields: string[]) => {
    setGroupSkipFields(skippedFields);
    setOverrides({
      loaded: 0,
      remainingFieldCandidates: [],
      significantTerms: data.significantTerms.filter((d) => !skippedFields.includes(d.fieldName)),
      regroupOnly: true,
    });
    startHandler(true, false);
  };

  const {
    cancel,
    start,
    data,
    isRunning,
    errors: streamErrors,
  } = useFetchStream(
    http,
    '/internal/aiops/log_rate_analysis',
    '1',
    {
      start: earliest,
      end: latest,
      searchQuery: JSON.stringify(searchQuery),
      // TODO Handle data view without time fields.
      timeFieldName: dataView.timeFieldName ?? '',
      index: dataView.getIndexPattern(),
      grouping: true,
      flushFix: true,
      ...windowParameters,
      overrides,
      sampleProbability,
    },
    { reducer: streamReducer, initialState }
  );

  const { significantTerms } = data;
  useEffect(
    () => setUniqueFieldNames(uniq(significantTerms.map((d) => d.fieldName)).sort()),
    [significantTerms]
  );

  useEffect(() => {
    if (!isRunning) {
      const { loaded, remainingFieldCandidates, groupsMissing } = data;

      if (
        loaded < 1 &&
        ((Array.isArray(remainingFieldCandidates) && remainingFieldCandidates.length > 0) ||
          groupsMissing)
      ) {
        setOverrides({ loaded, remainingFieldCandidates, significantTerms: data.significantTerms });
      } else {
        setOverrides(undefined);
        if (onAnalysisCompleted) {
          onAnalysisCompleted({
            significantTerms: data.significantTerms,
            significantTermsGroups: data.significantTermsGroups,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const errors = useMemo(() => [...streamErrors, ...data.errors], [streamErrors, data.errors]);

  // Start handler clears possibly hovered or pinned
  // significant terms on analysis refresh.
  function startHandler(continueAnalysis = false, resetGroupButton = true) {
    if (!continueAnalysis) {
      setOverrides(undefined);
      setUniqueFieldNames([]);
    }

    // Reset grouping to false and clear all row selections when restarting the analysis.
    if (resetGroupButton) {
      setGroupResults(false);
      setToggleIdSelected(resultsGroupedOffId);
      clearAllRowState();
    }

    setCurrentAnalysisWindowParameters(windowParameters);

    // We trigger hooks updates above so we cannot directly call `start()` here
    // because it would be run with stale arguments.
    setShouldStart(true);
  }

  useEffect(() => {
    if (shouldStart) {
      start();
      setShouldStart(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldStart]);

  useEffect(() => {
    setCurrentAnalysisWindowParameters(windowParameters);
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupTableItems = useMemo(
    () => getGroupTableItems(data.significantTermsGroups),
    [data.significantTermsGroups]
  );

  const shouldRerunAnalysis = useMemo(
    () =>
      currentAnalysisWindowParameters !== undefined &&
      !isEqual(currentAnalysisWindowParameters, windowParameters),
    [currentAnalysisWindowParameters, windowParameters]
  );

  const showLogRateAnalysisResultsTable = data?.significantTerms.length > 0;
  const groupItemCount = groupTableItems.reduce((p, c) => {
    return p + c.groupItemsSortedByUniqueness.length;
  }, 0);
  const foundGroups = groupTableItems.length > 0 && groupItemCount > 0;
  const timeRangeMs = { from: earliest, to: latest };

  // Disable the grouping switch toggle only if no groups were found,
  // the toggle wasn't enabled already and no fields were selected to be skipped.
  const disabledGroupResultsSwitch = !foundGroups && !groupResults && groupSkipFields.length === 0;

  const toggleButtons = [
    {
      id: resultsGroupedOffId,
      label: groupResultsOffMessage,
      'data-test-subj': 'aiopsLogRateAnalysisGroupSwitchOff',
    },
    {
      id: resultsGroupedOnId,
      label: groupResultsOnMessage,
      'data-test-subj': 'aiopsLogRateAnalysisGroupSwitchOn',
    },
  ];

  return (
    <div data-test-subj="aiopsLogRateAnalysisResults">
      <ProgressControls
        isBrushCleared={isBrushCleared}
        progress={data.loaded}
        progressMessage={data.loadingState ?? ''}
        isRunning={isRunning}
        onRefresh={() => startHandler(false)}
        onCancel={cancel}
        onReset={onReset}
        shouldRerunAnalysis={shouldRerunAnalysis}
      >
        <EuiFlexItem grow={false}>
          <EuiFormRow display="columnCompressedSwitch">
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="xs">{groupResultsMessage}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  data-test-subj={`aiopsLogRateAnalysisGroupSwitch${
                    groupResults ? ' checked' : ''
                  }`}
                  buttonSize="s"
                  isDisabled={disabledGroupResultsSwitch}
                  legend="Smart grouping"
                  options={toggleButtons}
                  idSelected={toggleIdSelected}
                  onChange={onGroupResultsToggle}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FieldFilterPopover
            disabled={!groupResults || isRunning}
            disabledApplyButton={isRunning}
            uniqueFieldNames={uniqueFieldNames}
            onChange={onFieldsFilterChange}
          />
        </EuiFlexItem>
      </ProgressControls>
      {errors.length > 0 ? (
        <>
          <EuiSpacer size="xs" />
          <EuiCallOut
            title={i18n.translate('xpack.aiops.analysis.errorCallOutTitle', {
              defaultMessage:
                'The following {errorCount, plural, one {error} other {errors}} occurred running the analysis.',
              values: { errorCount: errors.length },
            })}
            color="warning"
            iconType="warning"
            size="s"
          >
            <EuiText size="s">
              {errors.length === 1 ? (
                <p>{errors[0]}</p>
              ) : (
                <ul>
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
              {overrides !== undefined ? (
                <p>
                  <EuiButton size="s" onClick={() => startHandler(true)}>
                    <FormattedMessage
                      id="xpack.aiops.logRateAnalysis.page.tryToContinueAnalysisButtonText"
                      defaultMessage="Try to continue analysis"
                    />
                  </EuiButton>
                </p>
              ) : null}
            </EuiText>
          </EuiCallOut>
          <EuiSpacer size="xs" />
        </>
      ) : null}
      {showLogRateAnalysisResultsTable && groupResults && foundGroups && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs">{groupResults ? groupResultsHelpMessage : undefined}</EuiText>
        </>
      )}
      <EuiSpacer size="xs" />
      {!isRunning && !showLogRateAnalysisResultsTable && (
        <EuiEmptyPrompt
          data-test-subj="aiopsNoResultsFoundEmptyPrompt"
          title={
            <h2>
              <FormattedMessage
                id="xpack.aiops.logRateAnalysis.page.noResultsPromptTitle"
                defaultMessage="The analysis did not return any results."
              />
            </h2>
          }
          titleSize="xs"
          body={
            <p>
              <FormattedMessage
                id="xpack.aiops.logRateAnalysis.page.noResultsPromptBody"
                defaultMessage="Try to adjust the baseline and deviation time ranges and rerun the analysis. If you still get no results, there might be no statistically significant entities contributing to this spike in log rates."
              />
            </p>
          }
        />
      )}
      {/* Using inline style as Eui Table overwrites overflow settings  */}
      <div
        style={
          stickyHistogram
            ? {
                height: '500px',
                overflowX: 'hidden',
                overflowY: 'auto',
                paddingTop: '20px',
              }
            : undefined
        }
      >
        {showLogRateAnalysisResultsTable && groupResults ? (
          <LogRateAnalysisResultsGroupsTable
            significantTerms={data.significantTerms}
            groupTableItems={groupTableItems}
            loading={isRunning}
            dataView={dataView}
            timeRangeMs={timeRangeMs}
            searchQuery={searchQuery}
            barColorOverride={barColorOverride}
            barHighlightColorOverride={barHighlightColorOverride}
          />
        ) : null}
        {showLogRateAnalysisResultsTable && !groupResults ? (
          <LogRateAnalysisResultsTable
            significantTerms={data.significantTerms}
            loading={isRunning}
            dataView={dataView}
            timeRangeMs={timeRangeMs}
            searchQuery={searchQuery}
            barColorOverride={barColorOverride}
            barHighlightColorOverride={barHighlightColorOverride}
          />
        ) : null}
      </div>
    </div>
  );
};
