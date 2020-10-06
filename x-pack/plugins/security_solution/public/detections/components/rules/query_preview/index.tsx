/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { Unit } from '@elastic/datemath';
import { getOr } from 'lodash/fp';
import styled from 'styled-components';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiFormRow,
  EuiButton,
  EuiCallOut,
  EuiSelectOption,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import { IndexPattern } from 'src/plugins/data/public';
import * as i18n from './translations';
import { useKibana } from '../../../../common/lib/kibana';
import { ESQueryStringQuery } from '../../../../../common/typed_json';
import { getQueryFilter } from '../../../../../common/detection_engine/get_query_filter';
import { useFetchIndex } from '../../../../common/containers/source';
import { FieldValueQueryBar } from '../query_bar';
import { Filter, RangeFilter } from '../../../../../../../../src/plugins/data/common/es_query';
import { Language, Type } from '../../../../../common/detection_engine/schemas/common/schemas';
import { PreviewEqlQueryHistogram } from './eql_histogram';
import { useEqlPreview } from '../../../../common/hooks/eql';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { PreviewNonEqlQueryHistogram } from './non_eql_histogram';
import { getTimeframeOptions } from './helpers';
import { PreviewThresholdQueryHistogram } from './threshold_histogram';

const Select = styled(EuiSelect)`
  width: ${({ theme }) => theme.eui.euiSuperDatePickerWidth};
`;

const PreviewButton = styled(EuiButton)`
  margin-left: 0;
`;

interface PreviewQueryProps {
  dataTestSubj: string;
  idAria: string;
  query: FieldValueQueryBar | undefined;
  index: string[];
  ruleType: Type;
  threshold: { field: string | undefined; value: number } | undefined;
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
  const { data } = useKibana().services;
  const [, { indexPatterns }] = useFetchIndex(index);
  const { addError } = useAppToasts();

  const [timeframeOptions, setTimeframeOptions] = useState<EuiSelectOption[]>([]);
  const [showHistogram, setShowHistogram] = useState(false);
  const [timeframe, setTimeframe] = useState<Unit>('h');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [queryFilter, setQueryFilter] = useState<ESQueryStringQuery | undefined>(undefined);
  const [toTime, setTo] = useState('');
  const [fromTime, setFrom] = useState('');
  const {
    error: eqlError,
    start: startEql,
    result: eqlQueryResult,
    loading: eqlQueryLoading,
  } = useEqlPreview();

  const queryString = useMemo((): string => getOr('', 'query.query', query), [query]);
  const language = useMemo((): Language => getOr('kuery', 'query.language', query), [query]);
  const filters = useMemo((): Filter[] => (query != null ? query.filters : []), [query]);

  const handleCalculateTimeRange = useCallback(
    (interval: Unit): { to: string; from: string } => {
      const rangeFilter: RangeFilter | undefined = data.query.timefilter.timefilter.createFilter(
        { ...indexPatterns, timeFieldName: '@timestamp' } as IndexPattern,
        { from: `now-1${interval}`, to: 'now' }
      );

      const to = rangeFilter != null ? `${rangeFilter.range['@timestamp'].gte}` : null;
      const from = rangeFilter != null ? `${rangeFilter.range['@timestamp'].lte}` : null;

      if (to != null && from != null) {
        setTo(to);
        setFrom(from);
      }

      return { to: to ?? toTime, from: from ?? fromTime };
    },
    [data, indexPatterns, toTime, fromTime]
  );

  const handlePreviewEqlQuery = useCallback(
    (to: string, from: string, interval: Unit): void => {
      startEql({
        data,
        index,
        query: queryString,
        fromTime: from,
        toTime: to,
        interval,
      });
    },
    [data, index, startEql, queryString]
  );

  const handleSelectPreviewTimeframe = ({
    target: { value },
  }: React.ChangeEvent<HTMLSelectElement>): void => {
    setTimeframe(value as Unit);
    setShowHistogram(false);
  };

  const handlePreviewClicked = useCallback((): void => {
    const { to, from } = handleCalculateTimeRange(timeframe);

    if (ruleType === 'eql') {
      setShowHistogram(true);
      handlePreviewEqlQuery(to, from, timeframe);
    } else {
      const builtFilterQuery = {
        ...((getQueryFilter(
          queryString,
          language,
          filters,
          index,
          [],
          true
        ) as unknown) as ESQueryStringQuery),
      };
      if (builtFilterQuery != null) {
        setShowHistogram(true);
      }
      setQueryFilter(builtFilterQuery);
    }
  }, [
    filters,
    handleCalculateTimeRange,
    handlePreviewEqlQuery,
    index,
    language,
    queryString,
    ruleType,
    timeframe,
  ]);

  useEffect((): void => {
    if (eqlError != null) {
      addError(eqlError, { title: i18n.PREVIEW_QUERY_ERROR });
    }
  }, [eqlError, addError]);

  // reset when rule type changes
  useEffect((): void => {
    const options = getTimeframeOptions(ruleType);

    setShowHistogram(false);
    setTimeframe('h');
    setTimeframeOptions(options);
    setWarnings([]);
  }, [ruleType]);

  // reset when timeframe or query changes
  useEffect((): void => {
    setShowHistogram(false);
    setWarnings([]);
  }, [timeframe, queryString]);

  useEffect((): void => {
    if (eqlQueryResult != null) {
      setWarnings((prevWarnings) => {
        if (eqlQueryResult.warnings.join() !== prevWarnings.join()) {
          return eqlQueryResult.warnings;
        }

        return prevWarnings;
      });
    }
  }, [eqlQueryResult]);

  const thresholdFieldExists = useMemo(
    (): boolean => threshold != null && threshold.field != null && threshold.field.trim() !== '',
    [threshold]
  );

  const showNonEqlHistogram = useMemo((): boolean => {
    return (
      ruleType === 'query' ||
      ruleType === 'saved_query' ||
      (ruleType === 'threshold' && !thresholdFieldExists)
    );
  }, [ruleType, thresholdFieldExists]);

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
      <EuiSpacer size="s" />
      {showNonEqlHistogram && showHistogram && (
        <PreviewNonEqlQueryHistogram
          filterQuery={queryFilter}
          index={index}
          from={fromTime}
          to={toTime}
        />
      )}
      {ruleType === 'threshold' && thresholdFieldExists && showHistogram && (
        <PreviewThresholdQueryHistogram
          filterQuery={queryFilter}
          index={index}
          from={fromTime}
          to={toTime}
          threshold={threshold}
        />
      )}
      {ruleType === 'eql' && eqlQueryResult != null && showHistogram && !eqlQueryLoading && (
        <PreviewEqlQueryHistogram
          to={toTime}
          from={fromTime}
          totalHits={eqlQueryResult.totalCount}
          data={eqlQueryResult.data}
          inspect={eqlQueryResult.inspect}
          query={queryString}
        />
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
    </>
  );
};
