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
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/public';
import { ProgressControls } from '@kbn/aiops-components';
import { useFetchStream } from '@kbn/aiops-utils';
import type { WindowParameters } from '@kbn/aiops-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { initialState, streamReducer } from '../../../common/api/stream_reducer';
import type { ApiExplainLogRateSpikes } from '../../../common/api';

import {
  getGroupTableItems,
  SpikeAnalysisTable,
  SpikeAnalysisGroupsTable,
} from '../spike_analysis_table';
import {} from '../spike_analysis_table';
import { useSpikeAnalysisTableRowContext } from '../spike_analysis_table/spike_analysis_table_row_provider';

import { FieldFilterPopover } from './field_filter_popover';

const groupResultsMessage = i18n.translate(
  'xpack.aiops.spikeAnalysisTable.groupedSwitchLabel.groupResults',
  {
    defaultMessage: 'Group results',
  }
);
const groupResultsHelpMessage = i18n.translate(
  'xpack.aiops.spikeAnalysisTable.groupedSwitchLabel.groupResultsHelpMessage',
  {
    defaultMessage: 'Items which are unique to a group are marked by an asterisk (*).',
  }
);

/**
 * ExplainLogRateSpikes props require a data view.
 */
interface ExplainLogRateSpikesAnalysisProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** Start timestamp filter */
  earliest: number;
  /** End timestamp filter */
  latest: number;
  /** Window parameters for the analysis */
  windowParameters: WindowParameters;
  /** The search query to be applied to the analysis as a filter */
  searchQuery: estypes.QueryDslQueryContainer;
  /** Sample probability to be applied to random sampler aggregations */
  sampleProbability: number;
}

export const ExplainLogRateSpikesAnalysis: FC<ExplainLogRateSpikesAnalysisProps> = ({
  dataView,
  earliest,
  latest,
  windowParameters,
  searchQuery,
  sampleProbability,
}) => {
  const { http } = useAiopsAppContext();
  const basePath = http.basePath.get() ?? '';

  const { clearAllRowState } = useSpikeAnalysisTableRowContext();

  const [currentAnalysisWindowParameters, setCurrentAnalysisWindowParameters] = useState<
    WindowParameters | undefined
  >();
  const [groupResults, setGroupResults] = useState<boolean>(false);
  const [groupSkipFields, setGroupSkipFields] = useState<string[]>([]);
  const [uniqueFieldNames, setUniqueFieldNames] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<
    ApiExplainLogRateSpikes['body']['overrides'] | undefined
  >(undefined);
  const [shouldStart, setShouldStart] = useState(false);

  const onGroupResultsToggle = (e: { target: { checked: React.SetStateAction<boolean> } }) => {
    setGroupResults(e.target.checked);

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
  } = useFetchStream<ApiExplainLogRateSpikes, typeof basePath>(
    `${basePath}/internal/aiops/explain_log_rate_spikes`,
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

  const showSpikeAnalysisTable = data?.significantTerms.length > 0;
  const groupItemCount = groupTableItems.reduce((p, c) => {
    return p + c.groupItemsSortedByUniqueness.length;
  }, 0);
  const foundGroups = groupTableItems.length > 0 && groupItemCount > 0;
  const timeRangeMs = { from: earliest, to: latest };

  // Disable the grouping switch toggle only if no groups were found,
  // the toggle wasn't enabled already and no fields were selected to be skipped.
  const disabledGroupResultsSwitch = !foundGroups && !groupResults && groupSkipFields.length === 0;

  return (
    <div data-test-subj="aiopsExplainLogRateSpikesAnalysis">
      <ProgressControls
        progress={data.loaded}
        progressMessage={data.loadingState ?? ''}
        isRunning={isRunning}
        onRefresh={() => startHandler(false)}
        onCancel={cancel}
        shouldRerunAnalysis={shouldRerunAnalysis}
      >
        <EuiFlexItem grow={false}>
          <EuiFormRow display="columnCompressedSwitch">
            <EuiSwitch
              data-test-subj={`aiopsExplainLogRateSpikesGroupSwitch${
                groupResults ? ' checked' : ''
              }`}
              disabled={disabledGroupResultsSwitch}
              showLabel={true}
              label={groupResultsMessage}
              checked={groupResults}
              onChange={onGroupResultsToggle}
              compressed
            />
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
                      id="xpack.aiops.explainLogRateSpikesPage.tryToContinueAnalysisButtonText"
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
      {showSpikeAnalysisTable && groupResults && foundGroups && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs">{groupResults ? groupResultsHelpMessage : undefined}</EuiText>
        </>
      )}
      <EuiSpacer size="xs" />
      {!isRunning && !showSpikeAnalysisTable && (
        <EuiEmptyPrompt
          data-test-subj="aiopsNoResultsFoundEmptyPrompt"
          title={
            <h2>
              <FormattedMessage
                id="xpack.aiops.explainLogRateSpikesPage.noResultsPromptTitle"
                defaultMessage="The analysis did not return any results."
              />
            </h2>
          }
          titleSize="xs"
          body={
            <p>
              <FormattedMessage
                id="xpack.aiops.explainLogRateSpikesPage.noResultsPromptBody"
                defaultMessage="Try to adjust the baseline and deviation time ranges and rerun the analysis. If you still get no results, there might be no statistically significant entities contributing to this spike in log rates."
              />
            </p>
          }
        />
      )}
      {showSpikeAnalysisTable && groupResults ? (
        <SpikeAnalysisGroupsTable
          significantTerms={data.significantTerms}
          groupTableItems={groupTableItems}
          loading={isRunning}
          dataView={dataView}
          timeRangeMs={timeRangeMs}
          searchQuery={searchQuery}
        />
      ) : null}
      {showSpikeAnalysisTable && !groupResults ? (
        <SpikeAnalysisTable
          significantTerms={data.significantTerms}
          loading={isRunning}
          dataView={dataView}
          timeRangeMs={timeRangeMs}
          searchQuery={searchQuery}
        />
      ) : null}
    </div>
  );
};
