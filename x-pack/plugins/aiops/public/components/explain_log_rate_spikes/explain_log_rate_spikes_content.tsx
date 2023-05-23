/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, FC } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiResizableContainer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { Dictionary } from '@kbn/ml-url-state';
import type { WindowParameters } from '@kbn/aiops-utils';
import type { SignificantTerm } from '@kbn/ml-agg-utils';

import { useData } from '../../hooks/use_data';
import { DocumentCountContent } from '../document_count_content/document_count_content';
import { ExplainLogRateSpikesAnalysis } from './explain_log_rate_spikes_analysis';
import type { GroupTableItem } from '../spike_analysis_table/types';
import { useSpikeAnalysisTableRowContext } from '../spike_analysis_table/spike_analysis_table_row_provider';
import type { AiOpsIndexBasedAppState } from '../../application/utils/url_state';

export function getDocumentCountStatsSplitLabel(
  significantTerm?: SignificantTerm,
  group?: GroupTableItem
) {
  if (significantTerm) {
    return `${significantTerm?.fieldName}:${significantTerm?.fieldValue}`;
  } else if (group) {
    return i18n.translate('xpack.aiops.spikeAnalysisPage.documentCountStatsSplitGroupLabel', {
      defaultMessage: 'Selected group',
    });
  }
}

interface Props {
  dataView: DataView;
  selectedSavedSearch: SavedSearch | null;
  aiopsListState: AiOpsIndexBasedAppState;
  setGlobalState?: (params: Dictionary<unknown>) => void;
  showTotalCount?: boolean;
}

export const ExplainLogRateSpikesContent: FC<Props> = ({
  dataView,
  selectedSavedSearch,
  aiopsListState,
  setGlobalState,
  showTotalCount = true,
}) => {
  const [windowParameters, setWindowParameters] = useState<WindowParameters | undefined>();

  const {
    currentSelectedSignificantTerm,
    currentSelectedGroup,
    setPinnedSignificantTerm,
    setPinnedGroup,
    setSelectedSignificantTerm,
    setSelectedGroup,
  } = useSpikeAnalysisTableRowContext();

  const { documentStats, earliest, latest, searchQuery } = useData(
    { selectedDataView: dataView, selectedSavedSearch },
    'explain_log_rage_spikes',
    aiopsListState,
    setGlobalState,
    currentSelectedSignificantTerm,
    currentSelectedGroup
  );

  const { sampleProbability, totalCount, documentCountStats, documentCountStatsCompare } =
    documentStats;

  function clearSelection() {
    setWindowParameters(undefined);
    setPinnedSignificantTerm(null);
    setPinnedGroup(null);
    setSelectedSignificantTerm(null);
    setSelectedGroup(null);
  }

  return (
    <EuiResizableContainer style={{ height: '400px' }} direction="vertical">
      {(EuiResizablePanel, EuiResizableButton) => (
        <>
          <EuiResizablePanel
            mode={'collapsible'}
            initialSize={60}
            minSize="40%"
            tabIndex={0}
            paddingSize="s"
          >
            {documentCountStats !== undefined && (
              <EuiFlexItem>
                <DocumentCountContent
                  brushSelectionUpdateHandler={setWindowParameters}
                  clearSelectionHandler={clearSelection}
                  documentCountStats={documentCountStats}
                  documentCountStatsSplit={documentCountStatsCompare}
                  documentCountStatsSplitLabel={getDocumentCountStatsSplitLabel(
                    currentSelectedSignificantTerm,
                    currentSelectedGroup
                  )}
                  showTotalCount={showTotalCount}
                  totalCount={totalCount}
                  sampleProbability={sampleProbability}
                  windowParameters={windowParameters}
                />
              </EuiFlexItem>
            )}
            <EuiHorizontalRule />
          </EuiResizablePanel>
          {/* <EuiResizableButton /> */}
          <EuiResizablePanel
            paddingSize="s"
            mode={'main'}
            initialSize={80}
            minSize="10%"
            tabIndex={0}
          >
            <EuiFlexItem>
              {earliest !== undefined && latest !== undefined && windowParameters !== undefined && (
                <ExplainLogRateSpikesAnalysis
                  dataView={dataView}
                  earliest={earliest}
                  latest={latest}
                  windowParameters={windowParameters}
                  searchQuery={searchQuery}
                  sampleProbability={sampleProbability}
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
                        id="xpack.aiops.explainLogRateSpikesPage.emptyPromptTitle"
                        defaultMessage="Click a spike in the histogram chart to start the analysis."
                      />
                    </h2>
                  }
                  titleSize="xs"
                  body={
                    <p>
                      <FormattedMessage
                        id="xpack.aiops.explainLogRateSpikesPage.emptyPromptBody"
                        defaultMessage="The explain log rate spikes feature identifies statistically significant field/value combinations that contribute to a log rate spike."
                      />
                    </p>
                  }
                  data-test-subj="aiopsNoWindowParametersEmptyPrompt"
                />
              )}
            </EuiFlexItem>
          </EuiResizablePanel>
        </>
      )}
    </EuiResizableContainer>
  );
};
