/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { ProgressControls } from '@kbn/aiops-components';
import { cancelStream, startStream } from '@kbn/ml-response-stream/client';
import {
  clearAllRowState,
  useAppDispatch,
  useAppSelector,
} from '@kbn/aiops-log-rate-analysis/state';
import {
  LOG_RATE_ANALYSIS_TYPE,
  type LogRateAnalysisType,
  type WindowParameters,
} from '@kbn/aiops-log-rate-analysis';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SignificantItem, SignificantItemGroup } from '@kbn/ml-agg-utils';
import { AIOPS_TELEMETRY_ID } from '@kbn/aiops-common/constants';
import type { AiopsLogRateAnalysisSchema } from '@kbn/aiops-log-rate-analysis/api/schema';
import type { AiopsLogRateAnalysisSchemaSignificantItem } from '@kbn/aiops-log-rate-analysis/api/schema_v2';

import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useDataSource } from '../../hooks/use_data_source';
import {
  commonColumns,
  significantItemColumns,
} from '../log_rate_analysis_results_table/use_columns';

import {
  getGroupTableItems,
  LogRateAnalysisResultsTable,
  LogRateAnalysisResultsGroupsTable,
} from '../log_rate_analysis_results_table';

import { ItemFilterPopover as FieldFilterPopover } from './item_filter_popover';
import { ItemFilterPopover as ColumnFilterPopover } from './item_filter_popover';
import { LogRateAnalysisTypeCallOut } from './log_rate_analysis_type_callout';
import type { ColumnNames } from '../log_rate_analysis_results_table';

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
const fieldFilterHelpText = i18n.translate('xpack.aiops.logRateAnalysis.page.fieldFilterHelpText', {
  defaultMessage:
    'Deselect non-relevant fields to remove them from groups and click the Apply button to rerun the grouping.  Use the search bar to filter the list, then select/deselect multiple fields with the actions below.',
});
const columnsFilterHelpText = i18n.translate(
  'xpack.aiops.logRateAnalysis.page.columnsFilterHelpText',
  {
    defaultMessage: 'Configure visible columns.',
  }
);
const disabledFieldFilterApplyButtonTooltipContent = i18n.translate(
  'xpack.aiops.analysis.fieldSelectorNotEnoughFieldsSelected',
  {
    defaultMessage: 'Grouping requires at least 2 fields to be selected.',
  }
);
const disabledColumnFilterApplyButtonTooltipContent = i18n.translate(
  'xpack.aiops.analysis.columnSelectorNotEnoughColumnsSelected',
  {
    defaultMessage: 'At least one column must be selected.',
  }
);
const columnSearchAriaLabel = i18n.translate('xpack.aiops.analysis.columnSelectorAriaLabel', {
  defaultMessage: 'Filter columns',
});
const columnsButton = i18n.translate('xpack.aiops.logRateAnalysis.page.columnsFilterButtonLabel', {
  defaultMessage: 'Columns',
});
const fieldsButton = i18n.translate('xpack.aiops.analysis.fieldFilterButtonLabel', {
  defaultMessage: 'Filter fields',
});

/**
 * Interface for log rate analysis results data.
 */
export interface LogRateAnalysisResultsData {
  /** The type of analysis, whether it's a spike or dip */
  analysisType: LogRateAnalysisType;
  /** Statistically significant field/value items. */
  significantItems: SignificantItem[];
  /** Statistically significant groups of field/value items. */
  significantItemsGroups: SignificantItemGroup[];
}

/**
 * LogRateAnalysis props require a data view.
 */
interface LogRateAnalysisResultsProps {
  /** Callback for resetting the analysis */
  onReset: () => void;
  /** The search query to be applied to the analysis as a filter */
  searchQuery: estypes.QueryDslQueryContainer;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
  /** Identifier to indicate the plugin utilizing the component */
  embeddingOrigin: string;
}

export const LogRateAnalysisResults: FC<LogRateAnalysisResultsProps> = ({
  onReset,
  searchQuery,
  barColorOverride,
  barHighlightColorOverride,
  embeddingOrigin,
}) => {
  const { analytics, http } = useAiopsAppContext();
  const { dataView } = useDataSource();

  const dispatch = useAppDispatch();
  const {
    analysisType,
    earliest,
    latest,
    windowParameters,
    documentStats: { sampleProbability },
    stickyHistogram,
    isBrushCleared,
  } = useAppSelector((s) => s.logRateAnalysis);
  const { isRunning, errors: streamErrors } = useAppSelector((s) => s.logRateAnalysisStream);
  const data = useAppSelector((s) => s.logRateAnalysisResults);

  // Store the performance metric's start time using a ref
  // to be able to track it across rerenders.
  const analysisStartTime = useRef<number | undefined>(window.performance.now());
  const abortCtrl = useRef(new AbortController());

  const [currentAnalysisType, setCurrentAnalysisType] = useState<LogRateAnalysisType | undefined>();
  const [currentAnalysisWindowParameters, setCurrentAnalysisWindowParameters] = useState<
    WindowParameters | undefined
  >();
  const [groupResults, setGroupResults] = useState<boolean>(false);
  const [groupSkipFields, setGroupSkipFields] = useState<string[]>([]);
  const [uniqueFieldNames, setUniqueFieldNames] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<AiopsLogRateAnalysisSchema['overrides'] | undefined>(
    undefined
  );
  const [shouldStart, setShouldStart] = useState(false);
  const [toggleIdSelected, setToggleIdSelected] = useState(resultsGroupedOffId);
  const [skippedColumns, setSkippedColumns] = useState<ColumnNames[]>([
    'p-value',
    'Baseline rate',
    'Deviation rate',
  ]);

  const onGroupResultsToggle = (optionId: string) => {
    setToggleIdSelected(optionId);
    setGroupResults(optionId === resultsGroupedOnId);

    // When toggling the group switch, clear all row selections
    dispatch(clearAllRowState());
  };

  const onFieldsFilterChange = (skippedFields: string[]) => {
    setGroupSkipFields(skippedFields);
    setOverrides({
      loaded: 0,
      remainingFieldCandidates: [],
      significantItems: data.significantItems.filter(
        (d) => !skippedFields.includes(d.fieldName)
      ) as AiopsLogRateAnalysisSchemaSignificantItem[],
      regroupOnly: true,
    });
    startHandler(true, false);
  };

  const onVisibleColumnsChange = (columns: ColumnNames[]) => {
    setSkippedColumns(columns);
  };

  const { significantItems } = data;

  useEffect(
    () => setUniqueFieldNames(uniq(significantItems.map((d) => d.fieldName)).sort()),
    [significantItems]
  );

  function cancelHandler() {
    abortCtrl.current.abort();
    dispatch(cancelStream());
  }

  useEffect(() => {
    if (!isRunning) {
      const { loaded, remainingFieldCandidates, groupsMissing } = data;

      if (
        loaded < 1 &&
        ((Array.isArray(remainingFieldCandidates) && remainingFieldCandidates.length > 0) ||
          groupsMissing)
      ) {
        setOverrides({
          loaded,
          remainingFieldCandidates,
          significantItems: data.significantItems as AiopsLogRateAnalysisSchemaSignificantItem[],
        });
      } else if (loaded > 0) {
        // Reset all overrides.
        setOverrides(undefined);

        // Track performance metric
        if (analysisStartTime.current !== undefined) {
          const analysisDuration = window.performance.now() - analysisStartTime.current;

          // Set this to undefined so reporting the metric gets triggered only once.
          analysisStartTime.current = undefined;

          reportPerformanceMetricEvent(analytics, {
            eventName: 'aiopsLogRateAnalysisCompleted',
            duration: analysisDuration,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const errors = useMemo(() => [...streamErrors, ...data.errors], [streamErrors, data.errors]);

  // Start handler clears possibly hovered or pinned
  // significant items on analysis refresh.
  function startHandler(continueAnalysis = false, resetGroupButton = true) {
    if (!continueAnalysis) {
      setOverrides(undefined);
      setUniqueFieldNames([]);
    }

    // Reset grouping to false and clear all row selections when restarting the analysis.
    if (resetGroupButton) {
      setGroupResults(false);
      setToggleIdSelected(resultsGroupedOffId);
      dispatch(clearAllRowState());
    }

    setCurrentAnalysisType(analysisType);
    setCurrentAnalysisWindowParameters(windowParameters);

    // We trigger hooks updates above so we cannot directly call `start()` here
    // because it would be run with stale arguments.
    setShouldStart(true);
  }

  const startParams = useMemo(() => {
    if (!windowParameters) {
      return undefined;
    }

    return {
      http,
      endpoint: '/internal/aiops/log_rate_analysis',
      apiVersion: '2',
      abortCtrl,
      body: {
        start: earliest,
        end: latest,
        searchQuery: JSON.stringify(searchQuery),
        // TODO Handle data view without time fields.
        timeFieldName: dataView.timeFieldName ?? '',
        index: dataView.getIndexPattern(),
        grouping: true,
        flushFix: true,
        // If analysis type is `spike`, pass on window parameters as is,
        // if it's `dip`, swap baseline and deviation.
        ...(analysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE
          ? windowParameters
          : {
              baselineMin: windowParameters.deviationMin,
              baselineMax: windowParameters.deviationMax,
              deviationMin: windowParameters.baselineMin,
              deviationMax: windowParameters.baselineMax,
            }),
        overrides,
        sampleProbability,
      },
      headers: { [AIOPS_TELEMETRY_ID.AIOPS_ANALYSIS_RUN_ORIGIN]: embeddingOrigin },
    };
  }, [
    analysisType,
    earliest,
    latest,
    http,
    searchQuery,
    dataView,
    windowParameters,
    sampleProbability,
    overrides,
    embeddingOrigin,
  ]);

  useEffect(() => {
    if (shouldStart && startParams) {
      dispatch(startStream(startParams));
      setShouldStart(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldStart]);

  useEffect(() => {
    if (startParams) {
      setCurrentAnalysisType(analysisType);
      setCurrentAnalysisWindowParameters(windowParameters);
      dispatch(startStream(startParams));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupTableItems = useMemo(
    () => getGroupTableItems(data.significantItemsGroups),
    [data.significantItemsGroups]
  );

  const shouldRerunAnalysis = useMemo(
    () =>
      currentAnalysisWindowParameters !== undefined &&
      !isEqual(currentAnalysisWindowParameters, windowParameters),
    [currentAnalysisWindowParameters, windowParameters]
  );

  const showLogRateAnalysisResultsTable = data?.significantItems.length > 0;
  const groupItemCount = groupTableItems.reduce((p, c) => {
    return p + c.groupItemsSortedByUniqueness.length;
  }, 0);
  const foundGroups = groupTableItems.length > 0 && groupItemCount > 0;

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
        onCancel={cancelHandler}
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
            dataTestSubj="aiopsFieldFilterButton"
            disabled={!groupResults || isRunning}
            disabledApplyButton={isRunning}
            disabledApplyTooltipContent={disabledFieldFilterApplyButtonTooltipContent}
            helpText={fieldFilterHelpText}
            itemSearchAriaLabel={fieldsButton}
            popoverButtonTitle={fieldsButton}
            uniqueItemNames={uniqueFieldNames}
            onChange={onFieldsFilterChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ColumnFilterPopover
            dataTestSubj="aiopsColumnFilterButton"
            disabled={isRunning}
            disabledApplyButton={isRunning}
            disabledApplyTooltipContent={disabledColumnFilterApplyButtonTooltipContent}
            helpText={columnsFilterHelpText}
            itemSearchAriaLabel={columnSearchAriaLabel}
            initialSkippedItems={skippedColumns}
            popoverButtonTitle={columnsButton}
            selectedItemLimit={1}
            uniqueItemNames={
              (groupResults
                ? Object.values(commonColumns)
                : Object.values(significantItemColumns)) as string[]
            }
            onChange={onVisibleColumnsChange as (columns: string[]) => void}
          />
        </EuiFlexItem>
      </ProgressControls>
      {showLogRateAnalysisResultsTable && currentAnalysisType !== undefined && (
        <>
          <EuiSpacer size="s" />
          <LogRateAnalysisTypeCallOut analysisType={currentAnalysisType} />
          <EuiSpacer size="xs" />
        </>
      )}
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
                  <EuiButton
                    data-test-subj="aiopsLogRateAnalysisResultsTryToContinueAnalysisButton"
                    size="s"
                    onClick={() => startHandler(true)}
                  >
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
                defaultMessage="Try to adjust the baseline and deviation time ranges and rerun the analysis. If you still get no results, there might be no statistically significant entities contributing to this deviation in log rate."
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
            skippedColumns={skippedColumns}
            significantItems={data.significantItems}
            groupTableItems={groupTableItems}
            searchQuery={searchQuery}
            barColorOverride={barColorOverride}
            barHighlightColorOverride={barHighlightColorOverride}
          />
        ) : null}
        {showLogRateAnalysisResultsTable && !groupResults ? (
          <LogRateAnalysisResultsTable
            skippedColumns={skippedColumns}
            searchQuery={searchQuery}
            barColorOverride={barColorOverride}
            barHighlightColorOverride={barHighlightColorOverride}
          />
        ) : null}
      </div>
    </div>
  );
};
