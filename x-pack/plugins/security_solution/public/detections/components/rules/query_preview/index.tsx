/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useCallback, useEffect, useReducer, useRef } from 'react';
import { Unit } from '@elastic/datemath';
import styled from 'styled-components';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiFormRow,
  EuiButton,
  EuiCallOut,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { debounce } from 'lodash/fp';

import * as i18n from './translations';
import { useMatrixHistogram } from '../../../../common/containers/matrix_histogram';
import { MatrixHistogramType } from '../../../../../common/search_strategy/security_solution/matrix_histogram';
import { FieldValueQueryBar } from '../query_bar';
import { Type } from '../../../../../common/detection_engine/schemas/common/schemas';
import { PreviewEqlQueryHistogram } from './eql_histogram';
import { useEqlPreview } from '../../../../common/hooks/eql/';
import { PreviewThresholdQueryHistogram } from './threshold_histogram';
import { formatDate } from '../../../../common/components/super_date_picker';
import { State, queryPreviewReducer } from './reducer';
import { isNoisy } from './helpers';
import { PreviewCustomQueryHistogram } from './custom_histogram';

const Select = styled(EuiSelect)`
  width: ${({ theme }) => theme.eui.euiSuperDatePickerWidth};
`;

const PreviewButton = styled(EuiButton)`
  margin-left: 0;
`;

export const initialState: State = {
  timeframeOptions: [],
  showHistogram: false,
  timeframe: 'h',
  warnings: [],
  queryFilter: undefined,
  toTime: '',
  fromTime: '',
  queryString: '',
  language: 'kuery',
  filters: [],
  thresholdFieldExists: false,
  showNonEqlHistogram: false,
};

export type Threshold = { field: string | undefined; value: number } | undefined;

interface PreviewQueryProps {
  dataTestSubj: string;
  idAria: string;
  query: FieldValueQueryBar | undefined;
  index: string[];
  ruleType: Type;
  threshold: Threshold;
  isDisabled: boolean;
}

export const PreviewQuery = ({
  ruleType,
  dataTestSubj,
  idAria,
  query,
  index,
  threshold,
  isDisabled,
}: PreviewQueryProps) => {
  const [
    eqlQueryLoading,
    startEql,
    {
      totalCount: eqlQueryTotal,
      data: eqlQueryData,
      refetch: eqlQueryRefetch,
      inspect: eqlQueryInspect,
    },
  ] = useEqlPreview();

  const [
    {
      thresholdFieldExists,
      showNonEqlHistogram,
      timeframeOptions,
      showHistogram,
      timeframe,
      warnings,
      queryFilter,
      toTime,
      fromTime,
      queryString,
    },
    dispatch,
  ] = useReducer(queryPreviewReducer(), {
    ...initialState,
    toTime: formatDate('now-1h'),
    fromTime: formatDate('now'),
  });
  const [
    isMatrixHistogramLoading,
    { inspect, totalCount: matrixHistTotal, refetch, data: matrixHistoData, buckets },
    startNonEql,
  ] = useMatrixHistogram({
    errorMessage: i18n.QUERY_PREVIEW_ERROR,
    endDate: fromTime,
    startDate: toTime,
    filterQuery: queryFilter,
    indexNames: index,
    histogramType: MatrixHistogramType.events,
    stackByField: 'event.category',
    threshold: ruleType === 'threshold' ? threshold : undefined,
    skip: true,
  });

  const setQueryInfo = useCallback(
    (queryBar: FieldValueQueryBar | undefined, indices: string[], type: Type): void => {
      dispatch({
        type: 'setQueryInfo',
        queryBar,
        index: indices,
        ruleType: type,
      });
    },
    [dispatch]
  );

  const debouncedSetQueryInfo = useRef(debounce(500, setQueryInfo));

  const setTimeframeSelect = useCallback(
    (selection: Unit): void => {
      dispatch({
        type: 'setTimeframeSelect',
        timeframe: selection,
      });
    },
    [dispatch]
  );

  const setRuleTypeChange = useCallback(
    (type: Type): void => {
      dispatch({
        type: 'setResetRuleTypeChange',
        ruleType: type,
      });
    },
    [dispatch]
  );

  const setWarnings = useCallback(
    (yikes: string[]): void => {
      dispatch({
        type: 'setWarnings',
        warnings: yikes,
      });
    },
    [dispatch]
  );

  const setNoiseWarning = useCallback((): void => {
    dispatch({
      type: 'setNoiseWarning',
    });
  }, [dispatch]);

  const setShowHistogram = useCallback(
    (show: boolean): void => {
      dispatch({
        type: 'setShowHistogram',
        show,
      });
    },
    [dispatch]
  );

  const setThresholdValues = useCallback(
    (thresh: Threshold, type: Type): void => {
      dispatch({
        type: 'setThresholdQueryVals',
        threshold: thresh,
        ruleType: type,
      });
    },
    [dispatch]
  );

  useEffect(() => {
    debouncedSetQueryInfo.current(query, index, ruleType);
  }, [index, query, ruleType]);

  useEffect((): void => {
    setThresholdValues(threshold, ruleType);
  }, [setThresholdValues, threshold, ruleType]);

  useEffect((): void => {
    setRuleTypeChange(ruleType);
  }, [ruleType, setRuleTypeChange]);

  useEffect((): void => {
    switch (ruleType) {
      case 'eql':
        if (isNoisy(eqlQueryTotal, timeframe)) {
          setNoiseWarning();
        }
        break;
      case 'threshold':
        const totalHits = thresholdFieldExists ? buckets.length : matrixHistTotal;
        if (isNoisy(totalHits, timeframe)) {
          setNoiseWarning();
        }
        break;
      default:
        if (isNoisy(matrixHistTotal, timeframe)) {
          setNoiseWarning();
        }
    }
  }, [
    timeframe,
    matrixHistTotal,
    eqlQueryTotal,
    ruleType,
    setNoiseWarning,
    thresholdFieldExists,
    buckets.length,
  ]);

  const handlePreviewEqlQuery = useCallback(
    (to: string, from: string): void => {
      startEql({
        index,
        query: queryString,
        from,
        to,
        interval: timeframe,
      });
    },
    [startEql, index, queryString, timeframe]
  );

  const handleSelectPreviewTimeframe = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>): void => {
      setTimeframeSelect(value as Unit);
    },
    [setTimeframeSelect]
  );

  const handlePreviewClicked = useCallback((): void => {
    const to = formatDate('now');
    const from = formatDate(`now-1${timeframe}`);

    setWarnings([]);
    setShowHistogram(true);

    if (ruleType === 'eql') {
      handlePreviewEqlQuery(to, from);
    } else {
      startNonEql(to, from);
    }
  }, [setWarnings, setShowHistogram, ruleType, handlePreviewEqlQuery, startNonEql, timeframe]);

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
              aria-label={i18n.QUERY_PREVIEW_SELECT_ARIA}
              disabled={isDisabled}
              data-test-subj="queryPreviewTimeframeSelect"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PreviewButton
              fill
              isDisabled={
                isMatrixHistogramLoading || eqlQueryLoading || isDisabled || query == null
              }
              onClick={handlePreviewClicked}
              data-test-subj="queryPreviewButton"
            >
              {i18n.QUERY_PREVIEW_BUTTON}
            </PreviewButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiSpacer size="s" />
      {showNonEqlHistogram && showHistogram && (
        <PreviewCustomQueryHistogram
          to={toTime}
          from={fromTime}
          data={matrixHistoData}
          totalCount={matrixHistTotal}
          inspect={inspect}
          refetch={refetch}
          isLoading={isMatrixHistogramLoading}
          data-test-subj="previewNonEqlQueryHistogram"
        />
      )}
      {ruleType === 'threshold' && thresholdFieldExists && showHistogram && (
        <PreviewThresholdQueryHistogram
          isLoading={isMatrixHistogramLoading}
          buckets={buckets}
          inspect={inspect}
          refetch={refetch}
          data-test-subj="previewThresholdQueryHistogram"
        />
      )}
      {ruleType === 'eql' && showHistogram && (
        <PreviewEqlQueryHistogram
          to={toTime}
          from={fromTime}
          totalCount={eqlQueryTotal}
          data={eqlQueryData}
          inspect={eqlQueryInspect}
          refetch={eqlQueryRefetch}
          isLoading={eqlQueryLoading}
          data-test-subj="previewEqlQueryHistogram"
        />
      )}
      {showHistogram &&
        warnings.length > 0 &&
        warnings.map((warning, i) => (
          <Fragment key={`${warning}-${i}`}>
            <EuiSpacer size="s" />
            <EuiCallOut color="warning" iconType="help" data-test-subj="previewQueryWarning">
              <EuiText>
                <p>{warning}</p>
              </EuiText>
            </EuiCallOut>
          </Fragment>
        ))}
    </>
  );
};
