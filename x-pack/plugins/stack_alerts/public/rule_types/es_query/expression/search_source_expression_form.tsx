/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import deepEqual from 'fast-deep-equal';
import { lastValueFrom } from 'rxjs';
import type { Filter, Query } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import type { SearchBarProps } from '@kbn/unified-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  mapAndFlattenFilters,
  getTime,
  type SavedQuery,
  type ISearchSource,
} from '@kbn/data-plugin/public';
import { STACK_ALERTS_FEATURE_ID } from '../../../../common';
import { CommonRuleParams, EsQueryRuleMetaData, EsQueryRuleParams, SearchType } from '../types';
import { DEFAULT_VALUES } from '../constants';
import { DataViewSelectPopover } from '../../components/data_view_select_popover';
import { RuleCommonExpressions } from '../rule_common_expressions';
import { totalHitsToNumber } from '../test_query_row';
import { useTriggerUiActionServices } from '../util';
import { hasExpressionValidationErrors } from '../validation';

const HIDDEN_FILTER_PANEL_OPTIONS: SearchBarProps['hiddenFilterPanelOptions'] = [
  'pinFilter',
  'disableFilter',
];

interface LocalState {
  index?: DataView;
  filter: Filter[];
  query: Query;
  thresholdComparator: CommonRuleParams['thresholdComparator'];
  threshold: CommonRuleParams['threshold'];
  timeWindowSize: CommonRuleParams['timeWindowSize'];
  timeWindowUnit: CommonRuleParams['timeWindowUnit'];
  size: CommonRuleParams['size'];
  excludeHitsFromPreviousRun: CommonRuleParams['excludeHitsFromPreviousRun'];
}

interface LocalStateAction {
  type:
    | SearchSourceParamsAction['type']
    | (
        | 'threshold'
        | 'thresholdComparator'
        | 'timeWindowSize'
        | 'timeWindowUnit'
        | 'size'
        | 'excludeHitsFromPreviousRun'
      );
  payload: SearchSourceParamsAction['payload'] | (number[] | number | string | boolean);
}

type LocalStateReducer = (prevState: LocalState, action: LocalStateAction) => LocalState;

interface SearchSourceParamsAction {
  type: 'index' | 'filter' | 'query';
  payload: DataView | Filter[] | Query;
}

interface SearchSourceExpressionFormProps {
  searchSource: ISearchSource;
  ruleParams: EsQueryRuleParams<SearchType.searchSource>;
  errors: IErrorObject;
  metadata?: EsQueryRuleMetaData;
  initialSavedQuery?: SavedQuery;
  setParam: (paramField: string, paramValue: unknown) => void;
  onChangeMetaData: (metadata: EsQueryRuleMetaData) => void;
}

const isSearchSourceParam = (action: LocalStateAction): action is SearchSourceParamsAction => {
  return action.type === 'filter' || action.type === 'index' || action.type === 'query';
};

export const SearchSourceExpressionForm = (props: SearchSourceExpressionFormProps) => {
  const services = useTriggerUiActionServices();
  const unifiedSearch = services.unifiedSearch;
  const { searchSource, errors, initialSavedQuery, setParam, ruleParams } = props;
  const [savedQuery, setSavedQuery] = useState<SavedQuery>();

  useEffect(() => setSavedQuery(initialSavedQuery), [initialSavedQuery]);

  const [ruleConfiguration, dispatch] = useReducer<LocalStateReducer>(
    (currentState, action) => {
      if (isSearchSourceParam(action)) {
        searchSource.setParent(undefined).setField(action.type, action.payload);
        setParam('searchConfiguration', searchSource.getSerializedFields());

        if (action.type === 'index') {
          setParam('timeField', searchSource.getField('index')?.timeFieldName);
        }
      } else {
        setParam(action.type, action.payload);
      }
      return { ...currentState, [action.type]: action.payload };
    },
    {
      index: searchSource.getField('index'),
      query: searchSource.getField('query')! as Query,
      filter: mapAndFlattenFilters(searchSource.getField('filter') as Filter[]),
      threshold: ruleParams.threshold ?? DEFAULT_VALUES.THRESHOLD,
      thresholdComparator: ruleParams.thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR,
      timeWindowSize: ruleParams.timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
      timeWindowUnit: ruleParams.timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
      size: ruleParams.size ?? DEFAULT_VALUES.SIZE,
      excludeHitsFromPreviousRun:
        ruleParams.excludeHitsFromPreviousRun ?? DEFAULT_VALUES.EXCLUDE_PREVIOUS_HITS,
    }
  );

  const { index: dataView, query, filter: filters } = ruleConfiguration;
  const dataViews = useMemo(() => (dataView ? [dataView] : []), [dataView]);

  const onSelectDataView = useCallback(
    (newDataView: DataView) => dispatch({ type: 'index', payload: newDataView }),
    []
  );

  const onUpdateFilters = useCallback((newFilters) => {
    dispatch({ type: 'filter', payload: mapAndFlattenFilters(newFilters) });
  }, []);

  const onChangeQuery = useCallback(
    ({ query: newQuery }: { query?: Query }) => {
      if (!deepEqual(newQuery, query)) {
        dispatch({ type: 'query', payload: newQuery || { ...query, query: '' } });
      }
    },
    [query]
  );

  // needs to change language mode only
  const onQueryBarSubmit = ({ query: newQuery }: { query?: Query }) => {
    if (newQuery?.language !== query.language) {
      dispatch({ type: 'query', payload: { ...query, language: newQuery?.language } as Query });
    }
  };

  // Saved query
  const onSavedQuery = useCallback((newSavedQuery: SavedQuery) => {
    setSavedQuery(newSavedQuery);
    const newFilters = newSavedQuery.attributes.filters;
    if (newFilters) {
      dispatch({ type: 'filter', payload: newFilters });
    }
  }, []);

  const onClearSavedQuery = () => {
    setSavedQuery(undefined);
    dispatch({ type: 'query', payload: { ...query, query: '' } });
  };

  // window size
  const onChangeWindowUnit = useCallback(
    (selectedWindowUnit: string) =>
      dispatch({ type: 'timeWindowUnit', payload: selectedWindowUnit }),
    []
  );

  const onChangeWindowSize = useCallback(
    (selectedWindowSize?: number) =>
      selectedWindowSize && dispatch({ type: 'timeWindowSize', payload: selectedWindowSize }),
    []
  );

  // threshold
  const onChangeSelectedThresholdComparator = useCallback(
    (selectedThresholdComparator?: string) =>
      selectedThresholdComparator &&
      dispatch({ type: 'thresholdComparator', payload: selectedThresholdComparator }),
    []
  );

  const onChangeSelectedThreshold = useCallback(
    (selectedThresholds?: number[]) =>
      selectedThresholds && dispatch({ type: 'threshold', payload: selectedThresholds }),
    []
  );

  const onChangeSizeValue = useCallback(
    (updatedValue: number) => dispatch({ type: 'size', payload: updatedValue }),
    []
  );

  const onChangeExcludeHitsFromPreviousRun = useCallback(
    (exclude: boolean) => dispatch({ type: 'excludeHitsFromPreviousRun', payload: exclude }),
    []
  );

  const timeWindow = `${ruleConfiguration.timeWindowSize}${ruleConfiguration.timeWindowUnit}`;

  const createTestSearchSource = useCallback(() => {
    const testSearchSource = searchSource.createCopy();
    const timeFilter = getTime(searchSource.getField('index')!, {
      from: `now-${timeWindow}`,
      to: 'now',
    });
    testSearchSource.setField(
      'filter',
      timeFilter ? [timeFilter, ...ruleConfiguration.filter] : ruleConfiguration.filter
    );
    return testSearchSource;
  }, [searchSource, timeWindow, ruleConfiguration]);

  const onCopyQuery = useCallback(() => {
    const testSearchSource = createTestSearchSource();
    return JSON.stringify(testSearchSource.getSearchRequestBody(), null, 2);
  }, [createTestSearchSource]);

  const onTestFetch = useCallback(async () => {
    const testSearchSource = createTestSearchSource();
    const { rawResponse } = await lastValueFrom(testSearchSource.fetch$());
    return { nrOfDocs: totalHitsToNumber(rawResponse.hits.total), timeWindow };
  }, [timeWindow, createTestSearchSource]);

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.selectDataViewPrompt"
            defaultMessage="Select a data view"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="s" />

      <DataViewSelectPopover
        dataView={dataView}
        metadata={props.metadata}
        onSelectDataView={onSelectDataView}
        onChangeMetaData={props.onChangeMetaData}
      />

      {Boolean(dataView?.id) && (
        <>
          <EuiSpacer size="s" />
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.stackAlerts.esQuery.ui.defineTextQueryPrompt"
                defaultMessage="Define your query"
              />
            </h5>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <unifiedSearch.ui.SearchBar
            appName={STACK_ALERTS_FEATURE_ID}
            onQuerySubmit={onQueryBarSubmit}
            onQueryChange={onChangeQuery}
            suggestionsSize="s"
            displayStyle="inPage"
            query={query}
            indexPatterns={dataViews}
            savedQuery={savedQuery}
            filters={filters}
            onFiltersUpdated={onUpdateFilters}
            onClearSavedQuery={onClearSavedQuery}
            onSavedQueryUpdated={onSavedQuery}
            onSaved={onSavedQuery}
            showSaveQuery
            showQueryInput
            showFilterBar
            showDatePicker={false}
            showAutoRefreshOnly={false}
            showSubmitButton={false}
            dateRangeFrom={undefined}
            dateRangeTo={undefined}
            hiddenFilterPanelOptions={HIDDEN_FILTER_PANEL_OPTIONS}
          />
        </>
      )}

      <EuiSpacer size="m" />

      <RuleCommonExpressions
        threshold={ruleConfiguration.threshold}
        thresholdComparator={ruleConfiguration.thresholdComparator}
        timeWindowSize={ruleConfiguration.timeWindowSize}
        timeWindowUnit={ruleConfiguration.timeWindowUnit}
        size={ruleConfiguration.size}
        onChangeThreshold={onChangeSelectedThreshold}
        onChangeThresholdComparator={onChangeSelectedThresholdComparator}
        onChangeWindowSize={onChangeWindowSize}
        onChangeWindowUnit={onChangeWindowUnit}
        onChangeSizeValue={onChangeSizeValue}
        errors={errors}
        hasValidationErrors={hasExpressionValidationErrors(props.ruleParams)}
        onTestFetch={onTestFetch}
        onCopyQuery={onCopyQuery}
        excludeHitsFromPreviousRun={ruleConfiguration.excludeHitsFromPreviousRun}
        onChangeExcludeHitsFromPreviousRun={onChangeExcludeHitsFromPreviousRun}
      />

      <EuiSpacer />
    </Fragment>
  );
};
