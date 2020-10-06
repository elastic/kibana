/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiFormRow,
  EuiButton,
  EuiLoadingChart,
  EuiCallOut,
  EuiSelectOption,
  EuiText,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import styled from 'styled-components';
import { Unit } from '@elastic/datemath';

import * as i18n from './translations';
import { Type } from '../../../../../common/detection_engine/schemas/common/schemas';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { BarChart } from '../../../../common/components/charts/barchart';
import { getHistogramConfig, getTimeframeOptions, getThresholdHistogramConfig } from './helpers';
import { ChartData } from '../../../../common/components/charts/common';
import { InspectQuery } from '../../../../common/store/inputs/model';
import { InspectButton } from '../../../../common/components/inspect';

export const ID = 'queryPreviewHistogramQuery';

const FlexGroup = styled(EuiFlexGroup)`
  height: 220px;
  width: 100%;
  position: relative;
  margin: 0;
`;

const GraphContainer = styled(EuiFlexGroup)`
  border: ${({ theme }) => theme.eui.euiBorderThin};
  padding: ${({ theme }) => theme.eui.euiSize};
`;

const Select = styled(EuiSelect)`
  width: ${({ theme }) => theme.eui.euiSuperDatePickerWidth};
`;

const PreviewButton = styled(EuiButton)`
  margin-left: 0;
`;

interface PreviewQueryHistogramProps {
  dataTestSubj: string;
  idAria: string;
  to: string;
  from: string;
  isLoading: boolean;
  totalHits: number;
  data: ChartData[];
  query: string;
  inspect: InspectQuery;
  ruleType: Type;
  errorExists: boolean;
  isDisabled: boolean;
  warnings: string[];
  threshold: { field: string | undefined; value: number } | undefined;
  onPreviewClick: (arg: Unit) => void;
}

export const PreviewQueryHistogram = ({
  dataTestSubj,
  idAria,
  onPreviewClick,
  isLoading,
  from,
  to,
  totalHits,
  data,
  query,
  inspect,
  ruleType,
  errorExists,
  threshold,
  isDisabled,
  warnings,
}: PreviewQueryHistogramProps) => {
  const [timeframeOptions, setTimeframeOptions] = useState<EuiSelectOption[]>([]);
  const [showHistogram, setShowHistogram] = useState(false);
  const [timeframe, setTimeframe] = useState<Unit>('h');
  const { setQuery, isInitializing } = useGlobalTime();
  const ruleTypeRef = useRef<Type>('query');

  const handleSelectPreviewTimeframe = ({
    target: { value },
  }: React.ChangeEvent<HTMLSelectElement>): void => {
    setTimeframe(value as Unit);
    setShowHistogram(false);
  };

  const handlePreviewClicked = useCallback((): void => {
    setShowHistogram(true);

    onPreviewClick(timeframe);
  }, [onPreviewClick, timeframe]);

  useEffect((): void => {
    if (!isLoading && !isInitializing) {
      setQuery({ id: ID, inspect, loading: isLoading, refetch: () => {} });
    }
  }, [setQuery, inspect, isLoading, isInitializing]);

  // reset when rule type changes
  useEffect((): void => {
    const options = getTimeframeOptions(ruleType);

    ruleTypeRef.current = ruleType;
    setShowHistogram(false);
    setTimeframe('h');
    setTimeframeOptions(options);
  }, [ruleType]);

  return (
    <>
      <EuiFormRow
        label={i18n.QUERY_PREVIEW_LABEL}
        helpText={i18n.QUERY_PREVIEW_HELP_TEXT}
        error={undefined}
        isInvalid={false}
        data-test-subj={dataTestSubj}
        describedByIds={idAria ? [idAria] : undefined}
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <Select
              id="queryPreviewSelect"
              options={timeframeOptions}
              value={timeframe}
              onChange={handleSelectPreviewTimeframe}
              aria-label={i18n.PREVIEW_SELECT_ARIA}
              disabled={isDisabled}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PreviewButton fill isDisabled={isDisabled} onClick={handlePreviewClicked}>
              {i18n.PREVIEW_LABEL}
            </PreviewButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiSpacer size="m" />
      {showHistogram && isLoading && (
        <FlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="l" />
          </EuiFlexItem>
        </FlexGroup>
      )}
      {showHistogram && !isLoading && totalHits > 0 && (
        <>
          <GraphContainer gutterSize="none" direction="column">
            <EuiFlexItem grow={1}>
              <EuiFlexGroup direction="row" justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h2 data-test-subj="header-section-title">
                      {ruleType === 'threshold' && threshold != null && threshold.field != null
                        ? i18n.QUERY_PREVIEW_THRESHOLD_WITH_FIELD_TITLE(totalHits)
                        : i18n.QUERY_PREVIEW_TITLE(totalHits)}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <InspectButton
                    queryId={ID}
                    inspectIndex={0}
                    title={i18n.QUERY_PREVIEW_INSPECT_TITLE}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <BarChart
                configs={
                  ruleType === 'threshold' && threshold != null && threshold.field != null
                    ? getThresholdHistogramConfig()
                    : getHistogramConfig(to, from, query.includes('sequence'))
                }
                barChart={[{ key: 'hits', value: data }]}
                stackByField={undefined}
                timelineId={undefined}
              />
            </EuiFlexItem>
          </GraphContainer>
        </>
      )}
      {warnings.length > 0 &&
        warnings.map((warning) => (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut color="warning" iconType="help">
              <EuiText>
                <p>{warning}</p>
              </EuiText>
            </EuiCallOut>
          </>
        ))}
      {showHistogram && !isLoading && !errorExists && totalHits === 0 && (
        <EuiCallOut color="primary" iconType="help">
          <EuiFlexGroup direction="row" justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText>
                <p>{i18n.QUERY_PREVIEW_NO_HITS}</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <InspectButton
                queryId={ID}
                inspectIndex={0}
                title={i18n.QUERY_PREVIEW_TITLE(totalHits)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
      )}
    </>
  );
};
