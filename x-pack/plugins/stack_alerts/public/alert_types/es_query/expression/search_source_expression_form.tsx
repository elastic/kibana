/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import './search_source_expression.scss';
import { debounce } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Filter, DataView, Query, ISearchSource } from '@kbn/data-plugin/common';
import {
  ForLastExpression,
  IErrorObject,
  ThresholdExpression,
  ValueExpression,
} from '@kbn/triggers-actions-ui-plugin/public';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { mapAndFlattenFilters, SavedQuery, TimeHistory } from '@kbn/data-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { DataViewOption, EsQueryAlertParams, SearchType } from '../types';
import { DEFAULT_VALUES } from '../constants';
import { DataViewSelectPopover } from '../../components/data_view_select_popover';
import { useTriggersAndActionsUiDeps } from '../util';

interface LocalState {
  index: DataView;
  filter: Filter[];
  query: Query;
  threshold: number[];
  timeWindowSize: number;
  size: number;
}

interface LocalStateAction {
  type: SearchSourceParamsAction['type'] | ('threshold' | 'timeWindowSize' | 'size');
  payload: SearchSourceParamsAction['payload'] | (number[] | number);
}

type LocalStateReducer = (prevState: LocalState, action: LocalStateAction) => LocalState;

interface SearchSourceParamsAction {
  type: 'index' | 'filter' | 'query';
  payload: DataView | Filter[] | Query;
}

interface SearchSourceExpressionFormProps {
  searchSource: ISearchSource;
  ruleParams: EsQueryAlertParams<SearchType.searchSource>;
  errors: IErrorObject;
  initialSavedQuery?: SavedQuery;
  setParam: (paramField: string, paramValue: unknown) => void;
}

const isSearchSourceParam = (action: LocalStateAction): action is SearchSourceParamsAction => {
  return action.type === 'filter' || action.type === 'index' || action.type === 'query';
};

const withDebounce = debounce((execute: () => void) => execute(), 500, {
  leading: false,
  trailing: true,
});

export const SearchSourceExpressionForm = (props: SearchSourceExpressionFormProps) => {
  const { data } = useTriggersAndActionsUiDeps();
  const { searchSource, ruleParams, errors, initialSavedQuery, setParam } = props;
  const { thresholdComparator, timeWindowUnit } = ruleParams;
  const [savedQuery, setSavedQuery] = useState<SavedQuery>();

  const timeHistory = useMemo(() => new TimeHistory(new Storage(localStorage)), []);

  useEffect(() => setSavedQuery(initialSavedQuery), [initialSavedQuery]);

  /**
   *  Local state needed to optimize user inputs responsiveness
   */
  const [{ index: dataView, query, filter: filters, threshold, timeWindowSize, size }, dispatch] =
    useReducer<LocalStateReducer>(
      (currentState, action) => {
        if (isSearchSourceParam(action)) {
          searchSource.setParent(undefined).setField(action.type, action.payload);
          setParam('searchConfiguration', searchSource.getSerializedFields());
        } else {
          withDebounce(() => setParam(action.type, action.payload));
        }
        return { ...currentState, [action.type]: action.payload };
      },
      {
        index: searchSource.getField('index')!,
        query: searchSource.getField('query')!,
        filter: searchSource.getField('filter') as Filter[],
        threshold: ruleParams.threshold,
        timeWindowSize: ruleParams.timeWindowSize,
        size: ruleParams.size,
      }
    );
  const dataViews = useMemo(() => [dataView], [dataView]);

  const onSelectDataView = useCallback(
    ([selected]: DataViewOption[]) =>
      // type casting is safe, since id was set to ComboBox value
      data.dataViews
        .get(selected.value!)
        .then((newDataView) => dispatch({ type: 'index', payload: newDataView })),
    [data.dataViews]
  );

  const onUpdateFilters = useCallback((newFilters) => {
    dispatch({ type: 'filter', payload: mapAndFlattenFilters(newFilters) });
  }, []);

  const onChangeQuery = ({ query: newQuery }: { query?: Query }) => {
    withDebounce(() => dispatch({ type: 'query', payload: newQuery || { ...query, query: '' } }));
  };

  const onSavedQueryUpdated = (newSavedQuery: SavedQuery) => {
    setSavedQuery(newSavedQuery);
    const newFilters = newSavedQuery.attributes.filters;
    if (newFilters) {
      dispatch({ type: 'filter', payload: newFilters });
    }
  };

  const onClearSavedQuery = () => {
    setSavedQuery(undefined);
    dispatch({ type: 'query', payload: { ...query, query: '' } });
  };

  const onChangeWindowUnit = (selectedWindowUnit: string) =>
    setParam('timeWindowUnit', selectedWindowUnit);

  const onChangeWindowSize = (selectedWindowSize?: number) =>
    selectedWindowSize && dispatch({ type: 'timeWindowSize', payload: selectedWindowSize });

  const onChangeSelectedThresholdComparator = (selectedThresholdComparator?: string) =>
    setParam('thresholdComparator', selectedThresholdComparator);

  const onChangeSelectedThreshold = (selectedThresholds?: number[]) =>
    selectedThresholds && dispatch({ type: 'threshold', payload: selectedThresholds });

  const onChangeSizeValue = (updatedValue: number) =>
    dispatch({ type: 'size', payload: updatedValue });

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.searchThreshold.ui.conditionPrompt"
            defaultMessage="When the number of documents match"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="s" />
      <DataViewSelectPopover
        selectedDataViewTitle={dataView.title}
        onSelectDataView={onSelectDataView}
      />

      <EuiSpacer size="s" />

      <SearchBar
        suggestionsSize="s"
        displayStyle="inPage"
        placeholder={i18n.translate('xpack.stackAlerts.searchSource.ui.searchQuery', {
          defaultMessage: 'Search query',
        })}
        query={query}
        indexPatterns={dataViews}
        onQueryChange={onChangeQuery}
        savedQuery={savedQuery}
        filters={filters}
        onFiltersUpdated={onUpdateFilters}
        onClearSavedQuery={onClearSavedQuery}
        onSavedQueryUpdated={onSavedQueryUpdated}
        showSaveQuery={true}
        showQueryBar={true}
        showQueryInput={true}
        showFilterBar={true}
        showDatePicker={false}
        showAutoRefreshOnly={false}
        customSubmitButton={<></>}
        dateRangeFrom={undefined}
        dateRangeTo={undefined}
        timeHistory={timeHistory}
      />

      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.searchSource.ui.conditionPrompt"
            defaultMessage="When the number of matches"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ThresholdExpression
        data-test-subj="thresholdExpression"
        thresholdComparator={thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR}
        threshold={threshold ?? DEFAULT_VALUES.THRESHOLD}
        errors={errors}
        display="fullWidth"
        popupPosition={'upLeft'}
        onChangeSelectedThreshold={onChangeSelectedThreshold}
        onChangeSelectedThresholdComparator={onChangeSelectedThresholdComparator}
      />
      <ForLastExpression
        data-test-subj="forLastExpression"
        popupPosition={'upLeft'}
        timeWindowSize={timeWindowSize}
        timeWindowUnit={timeWindowUnit}
        display="fullWidth"
        errors={errors}
        onChangeWindowSize={onChangeWindowSize}
        onChangeWindowUnit={onChangeWindowUnit}
      />
      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.searchSource.ui.selectSizePrompt"
            defaultMessage="Select a size"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ValueExpression
        description={i18n.translate('xpack.stackAlerts.searchSource.ui.sizeExpression', {
          defaultMessage: 'Size',
        })}
        data-test-subj="sizeValueExpression"
        value={size}
        errors={errors.size}
        display="fullWidth"
        popupPosition={'upLeft'}
        onChangeSelectedValue={onChangeSizeValue}
      />
      <EuiSpacer size="s" />
    </Fragment>
  );
};
