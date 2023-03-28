/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, type ChangeEvent, type FC } from 'react';
import { isEqual, uniq } from 'lodash';
import { css } from '@emotion/react';

import {
  euiYScrollWithShadows,
  useEuiTheme,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
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
  searchQuery: Query['query'];
}

export const ExplainLogRateSpikesAnalysis: FC<ExplainLogRateSpikesAnalysisProps> = ({
  dataView,
  earliest,
  latest,
  windowParameters,
  searchQuery,
}) => {
  const euiThemeContext = useEuiTheme();
  const { http } = useAiopsAppContext();
  const basePath = http.basePath.get() ?? '';

  // maxHeight: $euiDataGridPopoverMaxHeight
  const fieldSelectPopover = useMemo(
    () => css`
      ${euiYScrollWithShadows(euiThemeContext, {})}
      max-height: 400px;
    `,
    [euiThemeContext]
  );

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

  const [fieldSearchText, setFieldSearchText] = useState('');
  const [skippedFields, setSkippedFields] = useState<string[]>([]);
  const setFieldsFilter = (fieldNames: string[], checked: boolean) => {
    let updatedSkippedFields = [...skippedFields];
    if (!checked) {
      updatedSkippedFields.push(...fieldNames);
    } else {
      updatedSkippedFields = skippedFields.filter((d) => !fieldNames.includes(d));
    }
    setSkippedFields(updatedSkippedFields);
    setOverrides({
      loaded: 0,
      remainingFieldCandidates: [],
      significantTerms: data.significantTerms.filter(
        (d) => !updatedSkippedFields.includes(d.fieldName)
      ),
      skipSignificantTermsHistograms: true,
    });
  };

  const [isFieldSelectionPopoverOpen, setIsFieldSelectionPopoverOpen] = useState(false);
  const onFieldSelectionButtonClick = () => setIsFieldSelectionPopoverOpen((isOpen) => !isOpen);
  const closePopover = () => setIsFieldSelectionPopoverOpen(false);

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

  const { significantTerms } = data;
  const uniqueFieldNames = useMemo(
    () => uniq(significantTerms.map((d) => d.fieldName)).sort(),
    [significantTerms]
  );
  const filteredUniqueFieldNames = useMemo(() => {
    return uniqueFieldNames.filter(
      (d) => d.toLowerCase().indexOf(fieldSearchText.toLowerCase()) !== -1
    );
  }, [fieldSearchText, uniqueFieldNames]);

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
    }

    // Reset grouping to false and clear all row selections when restarting the analysis.
    if (resetGroupButton) {
      setGroupResults(false);
      clearAllRowState();
      setSkippedFields([]);
      setIsFieldSelectionPopoverOpen(false);
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
              disabled={!foundGroups}
              showLabel={true}
              label={groupResultsMessage}
              checked={groupResults}
              onChange={onSwitchToggle}
              compressed
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <>
            <EuiPopover
              data-test-subj="aiopsFieldFilterPopover"
              anchorPosition="downLeft"
              panelPaddingSize="s"
              button={
                <EuiButton
                  data-test-subj="aiopsFieldFilterButton"
                  onClick={onFieldSelectionButtonClick}
                  disabled={!groupResults || isRunning}
                  size="s"
                  iconType="arrowDown"
                  iconSide="right"
                  iconSize="s"
                >
                  <FormattedMessage
                    id="xpack.aiops.explainLogRateSpikesPage.fieldFilterButtonLabel"
                    defaultMessage="Filter fields"
                  />
                </EuiButton>
              }
              isOpen={isFieldSelectionPopoverOpen}
              closePopover={closePopover}
            >
              <EuiPopoverTitle>
                <EuiFieldText
                  compressed
                  placeholder={i18n.translate('xpack.aiops.analysis.fieldSelectorPlaceholder', {
                    defaultMessage: 'Search',
                  })}
                  aria-label={i18n.translate('xpack.aiops.analysis.fieldSelectorAriaLabel', {
                    defaultMessage: 'Filter fields',
                  })}
                  value={fieldSearchText}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setFieldSearchText(e.currentTarget.value)
                  }
                  data-test-subj="dataGridColumnSelectorSearch"
                />
              </EuiPopoverTitle>
              <div css={fieldSelectPopover}>
                {filteredUniqueFieldNames.map((fieldName) => (
                  <div key={fieldName} css={{ padding: '4px' }}>
                    <EuiSwitch
                      className="euiSwitch--mini"
                      compressed
                      label={fieldName}
                      onChange={(e) => setFieldsFilter([fieldName], e.target.checked)}
                      checked={!skippedFields.includes(fieldName)}
                    />
                  </div>
                ))}
              </div>
              <EuiPopoverFooter>
                <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="spaceBetween">
                  {fieldSearchText.length > 0 && (
                    <>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="xs"
                          flush="left"
                          onClick={() => setFieldsFilter(filteredUniqueFieldNames, true)}
                          data-test-subj="dataGridColumnSelectorShowAllButton"
                        >
                          <FormattedMessage
                            id="xpack.aiops.explainLogRateSpikesPage.enableAllSelected"
                            defaultMessage="Enable filtered fields"
                          />
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="xs"
                          flush="right"
                          onClick={() => setFieldsFilter(filteredUniqueFieldNames, false)}
                          data-test-subj="dataGridColumnSelectorHideAllButton"
                        >
                          <FormattedMessage
                            id="xpack.aiops.explainLogRateSpikesPage.disableAllSelected"
                            defaultMessage="Disable filtered fields"
                          />
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    </>
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      onClick={() => {
                        startHandler(true, false);
                        setFieldSearchText('');
                        closePopover();
                      }}
                      disabled={isRunning}
                    >
                      <FormattedMessage
                        id="xpack.aiops.explainLogRateSpikesPage.applyFieldFilterLabel"
                        defaultMessage="Apply"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPopoverFooter>
            </EuiPopover>
          </>
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
      {showSpikeAnalysisTable && groupResults && foundGroups ? (
        <SpikeAnalysisGroupsTable
          significantTerms={data.significantTerms}
          groupTableItems={groupTableItems}
          loading={isRunning}
          dataViewId={dataView.id}
        />
      ) : null}
      {showSpikeAnalysisTable && (!groupResults || !foundGroups) ? (
        <SpikeAnalysisTable
          significantTerms={data.significantTerms}
          loading={isRunning}
          dataViewId={dataView.id}
        />
      ) : null}
    </div>
  );
};
