/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import './search_source_expression.scss';
import { EuiSpacer, EuiLoadingSpinner, EuiEmptyPrompt, EuiCallOut } from '@elastic/eui';
import { ISearchSource } from '@kbn/data-plugin/common';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { SavedQuery } from '@kbn/data-plugin/public';
import { EsQueryRuleMetaData, EsQueryRuleParams, SearchType } from '../types';
import { SearchSourceExpressionForm } from './search_source_expression_form';
import { DEFAULT_VALUES, SERVERLESS_DEFAULT_VALUES } from '../constants';
import { useTriggerUiActionServices } from '../util';

export type SearchSourceExpressionProps = RuleTypeParamsExpressionProps<
  EsQueryRuleParams<SearchType.searchSource>,
  EsQueryRuleMetaData
>;

export const SearchSourceExpression = ({
  ruleParams,
  errors,
  setRuleParams,
  setRuleProperty,
  metadata,
  onChangeMetaData,
}: SearchSourceExpressionProps) => {
  const {
    thresholdComparator,
    threshold,
    timeWindowSize,
    timeWindowUnit,
    size,
    savedQueryId,
    searchConfiguration,
    aggType,
    aggField,
    groupBy,
    termField,
    termSize,
    excludeHitsFromPreviousRun,
    sourceFields,
  } = ruleParams;
  const { data, isServerless } = useTriggerUiActionServices();

  const [searchSource, setSearchSource] = useState<ISearchSource>();
  const [savedQuery, setSavedQuery] = useState<SavedQuery>();
  const [paramsError, setParamsError] = useState<Error>();

  const setParam = useCallback(
    (paramField: string, paramValue: unknown) => {
      setRuleParams(paramField, paramValue);
    },
    [setRuleParams]
  );

  useEffect(() => {
    const initSearchSource = async () => {
      let initialSearchConfiguration = searchConfiguration;

      // Init searchConfiguration when creating rule from Stack Management page
      if (!searchConfiguration) {
        const newSearchSource = data.search.searchSource.createEmpty();
        newSearchSource.setField('query', data.query.queryString.getDefaultQuery());
        const defaultDataView = await data.dataViews.getDefaultDataView();
        if (
          defaultDataView &&
          defaultDataView.id !== 'log_rules_data_view' &&
          defaultDataView.id !== 'infra_rules_data_view'
        ) {
          newSearchSource.setField('index', defaultDataView);
        }
        initialSearchConfiguration = newSearchSource.getSerializedFields();
      }

      try {
        const createdSearchSource = await data.search.searchSource.create(
          initialSearchConfiguration
        );
        setRuleProperty('params', {
          searchConfiguration: initialSearchConfiguration,
          timeField: createdSearchSource.getField('index')?.timeFieldName,
          searchType: SearchType.searchSource,
          timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
          timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
          threshold: threshold ?? DEFAULT_VALUES.THRESHOLD,
          thresholdComparator: thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR,
          size: size ? size : isServerless ? SERVERLESS_DEFAULT_VALUES.SIZE : DEFAULT_VALUES.SIZE,
          aggType: aggType ?? DEFAULT_VALUES.AGGREGATION_TYPE,
          aggField,
          groupBy: groupBy ?? DEFAULT_VALUES.GROUP_BY,
          termField,
          termSize: termSize ?? DEFAULT_VALUES.TERM_SIZE,
          excludeHitsFromPreviousRun:
            excludeHitsFromPreviousRun ?? DEFAULT_VALUES.EXCLUDE_PREVIOUS_HITS,
          sourceFields,
        });
        setSearchSource(createdSearchSource);
      } catch (error) {
        setParamsError(error);
      }
    };

    initSearchSource();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.search.searchSource, data.dataViews]);

  useEffect(() => {
    if (savedQueryId) {
      data.query.savedQueries.getSavedQuery(savedQueryId).then(setSavedQuery);
    }
  }, [data.query.savedQueries, savedQueryId]);

  if (paramsError) {
    return (
      <>
        <EuiCallOut color="danger" iconType="warning">
          <p>{paramsError.message}</p>
        </EuiCallOut>
        <EuiSpacer size="s" />
      </>
    );
  }

  if (!searchSource) {
    return <EuiEmptyPrompt title={<EuiLoadingSpinner size="xl" />} />;
  }

  return (
    <SearchSourceExpressionForm
      ruleParams={ruleParams}
      searchSource={searchSource}
      errors={errors}
      initialSavedQuery={savedQuery}
      setParam={setParam}
      metadata={metadata}
      onChangeMetaData={onChangeMetaData}
    />
  );
};
