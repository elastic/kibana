/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, FC } from 'react';
import { isEqual } from 'lodash';

import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiFlexGroup,
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
import type { Query } from '@kbn/es-query';

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

const groupResultsMessage = i18n.translate(
  'xpack.aiops.spikeAnalysisTable.groupedSwitchLabel.groupResults',
  {
    defaultMessage: 'Group results',
  }
);
const groupResultsHelpMessage = i18n.translate(
  'xpack.aiops.spikeAnalysisTable.groupedSwitchLabel.groupResultsHelpMessage',
  {
    defaultMessage:
      'In expanded row, field/value pairs which do not appear in other groups are marked by an asterisk (*).',
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
  searchQuery: Query['query'];
}

export const ExplainLogRateSpikesAnalysis: FC<ExplainLogRateSpikesAnalysisProps> = ({
  dataView,
  earliest,
  latest,
  windowParameters,
  searchQuery,
}) => {
  const { http } = useAiopsAppContext();
  const basePath = http.basePath.get() ?? '';

  const { clearAllRowState } = useSpikeAnalysisTableRowContext();

  const [currentAnalysisWindowParameters, setCurrentAnalysisWindowParameters] = useState<
    WindowParameters | undefined
  >();
  const [groupResults, setGroupResults] = useState<boolean>(false);
  const [overrides, setOverrides] = useState<
    ApiExplainLogRateSpikes['body']['overrides'] | undefined
  >(undefined);
  const [shouldStart, setShouldStart] = useState(false);

  const onSwitchToggle = (e: { target: { checked: React.SetStateAction<boolean> } }) => {
    setGroupResults(e.target.checked);

    // When toggling the group switch, clear all row selections
    clearAllRowState();
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
    },
    { reducer: streamReducer, initialState }
  );

  useEffect(() => {
    if (!isRunning) {
      const { loaded, remainingFieldCandidates, groupsMissing } = data;

      if (
        loaded < 1 &&
        ((Array.isArray(remainingFieldCandidates) && remainingFieldCandidates.length > 0) ||
          groupsMissing)
      ) {
        setOverrides({ loaded, remainingFieldCandidates, changePoints: data.changePoints });
      } else {
        setOverrides(undefined);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const errors = useMemo(() => [...streamErrors, ...data.errors], [streamErrors, data.errors]);

  // Start handler clears possibly hovered or pinned
  // change points on analysis refresh.
  function startHandler(continueAnalysis = false) {
    if (!continueAnalysis) {
      setOverrides(undefined);
    }

    // Reset grouping to false and clear all row selections when restarting the analysis.
    setGroupResults(false);
    clearAllRowState();

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
    () => getGroupTableItems(data.changePointsGroups),
    [data.changePointsGroups]
  );

  const shouldRerunAnalysis = useMemo(
    () =>
      currentAnalysisWindowParameters !== undefined &&
      !isEqual(currentAnalysisWindowParameters, windowParameters),
    [currentAnalysisWindowParameters, windowParameters]
  );

  const showSpikeAnalysisTable = data?.changePoints.length > 0;
  const groupItemCount = groupTableItems.reduce((p, c) => {
    return p + c.group.length;
  }, 0);
  const foundGroups = groupTableItems.length > 0 && groupItemCount > 0;

  return (
    <div data-test-subj="aiopsExplainLogRateSpikesAnalysis">
      <ProgressControls
        progress={data.loaded}
        progressMessage={data.loadingState ?? ''}
        isRunning={isRunning}
        onRefresh={() => startHandler(false)}
        onCancel={cancel}
        shouldRerunAnalysis={shouldRerunAnalysis}
      />
      {errors.length > 0 ? (
        <>
          <EuiCallOut
            title={i18n.translate('xpack.aiops.analysis.errorCallOutTitle', {
              defaultMessage:
                'The following {errorCount, plural, one {error} other {errors}} occurred running the analysis.',
              values: { errorCount: errors.length },
            })}
            color="warning"
            iconType="alert"
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
      {showSpikeAnalysisTable && foundGroups && (
        <>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>
              <EuiFormRow display="columnCompressedSwitch" label={groupResultsMessage}>
                <EuiSwitch
                  data-test-subj={`aiopsExplainLogRateSpikesGroupSwitch${
                    groupResults ? ' checked' : ''
                  }`}
                  showLabel={false}
                  label={''}
                  checked={groupResults}
                  onChange={onSwitchToggle}
                  compressed
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              {groupResults && (
                <EuiFormRow helpText={groupResultsHelpMessage}>
                  <></>
                </EuiFormRow>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
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
      {showSpikeAnalysisTable && groupResults && foundGroups ? (
        <SpikeAnalysisGroupsTable
          changePoints={data.changePoints}
          groupTableItems={groupTableItems}
          loading={isRunning}
          dataViewId={dataView.id}
        />
      ) : null}
      {showSpikeAnalysisTable && (!groupResults || !foundGroups) ? (
        <SpikeAnalysisTable
          changePoints={data.changePoints}
          loading={isRunning}
          dataViewId={dataView.id}
        />
      ) : null}
    </div>
  );
};
