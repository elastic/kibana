/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useMemo, useReducer, useState } from 'react';
import './search_source_expression.scss';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiTitle, EuiExpression } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Filter, DataView, Query, ISearchSource } from '@kbn/data-plugin/common';
import {
  ForLastExpression,
  IErrorObject,
  ThresholdExpression,
  ValueExpression,
} from '@kbn/triggers-actions-ui-plugin/public';
import { FilterAdd } from '@kbn/unified-search-plugin/public';
import { mapAndFlattenFilters, SavedQuery } from '@kbn/data-plugin/public';
import { DataViewOption, EsQueryAlertParams, SearchType } from '../types';
import { DEFAULT_VALUES } from '../constants';
import { DataViewSelectPopover } from '../../components/data_view_select_popover';
import { useTriggersAndActionsUiDeps } from '../util';
import { FiltersList } from '../../components/filters_list';

interface SearchSourceParamsState {
  index: DataView;
  filter: Filter[];
  query: Query;
}

interface SearchSourceAction {
  type: 'index' | 'filter' | 'query';
  payload: DataView | Filter[] | Query;
}

type SearchSourceStateReducer = (
  prevState: SearchSourceParamsState,
  action: SearchSourceAction
) => SearchSourceParamsState;

interface SearchSourceExpressionFormProps {
  searchSource: ISearchSource;
  ruleParams: EsQueryAlertParams<SearchType.searchSource>;
  errors: IErrorObject;
  setParam: (paramField: string, paramValue: unknown) => void;
}

export const SearchSourceExpressionForm = (props: SearchSourceExpressionFormProps) => {
  const { data, unifiedSearch } = useTriggersAndActionsUiDeps();
  const { searchSource, ruleParams, errors, setParam } = props;
  const { thresholdComparator, threshold, timeWindowSize, timeWindowUnit, size } = ruleParams;
  const [savedQuery, setSavedQuery] = useState<SavedQuery>();
  const SearchBar = unifiedSearch.ui.SearchBar;

  // part of alert rule params
  const [{ index: dataView, query, filter: filters }, dispatch] =
    useReducer<SearchSourceStateReducer>(
      (currentState, action) => {
        searchSource.setParent(undefined).setField(action.type, action.payload);
        setParam('searchConfiguration', searchSource.getSerializedFields());
        return { ...currentState, [action.type]: action.payload };
      },
      {
        index: searchSource.getField('index')!,
        query: searchSource.getField('query')!,
        filter: (searchSource.getField('filter') as Filter[]).filter(({ meta }) => !meta.disabled),
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

  const onUpdateFilters = useCallback(
    (newFilters) => dispatch({ type: 'filter', payload: mapAndFlattenFilters(newFilters) }),
    []
  );

  const onAddFilter = (newFilter: Filter) => onUpdateFilters([...filters, newFilter]);

  const onChangeQuery = ({ query: newQuery }: { query?: Query }) =>
    dispatch({ type: 'query', payload: newQuery || { ...query, query: '' } });

  const onSavedQueryUpdated = (newSavedQuery: SavedQuery) => setSavedQuery(newSavedQuery);

  const onClearSavedQuery = () => {
    setSavedQuery(undefined);
    dispatch({ type: 'query', payload: { ...query, query: '' } });
  };

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
        appName="discover"
        displayStyle="inPage"
        placeholder={i18n.translate('xpack.stackAlerts.searchSource.ui.searchQuery', {
          defaultMessage: 'Search query',
        })}
        query={query}
        indexPatterns={dataViews}
        onQueryChange={onChangeQuery}
        savedQueryId={savedQuery?.id}
        onClearSavedQuery={onClearSavedQuery}
        onSavedQueryUpdated={onSavedQueryUpdated}
        showSaveQuery={true}
        showQueryBar={true}
        showQueryInput={true}
        showFilterBar={false}
        showDatePicker={false}
        showAutoRefreshOnly={false}
        customSubmitButton={<></>}
      />

      <EuiExpression
        className="dscExpressionParam searchSourceAlertFilters"
        title={'sas'}
        description={<FilterAdd dataViews={dataViews} onAdd={onAddFilter} />}
        value={
          <FiltersList filters={filters} dataViews={dataViews} onUpdateFilters={onUpdateFilters} />
        }
        display="columns"
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
        onChangeSelectedThreshold={(selectedThresholds) =>
          setParam('threshold', selectedThresholds)
        }
        onChangeSelectedThresholdComparator={(selectedThresholdComparator) =>
          setParam('thresholdComparator', selectedThresholdComparator)
        }
      />
      <ForLastExpression
        data-test-subj="forLastExpression"
        popupPosition={'upLeft'}
        timeWindowSize={timeWindowSize}
        timeWindowUnit={timeWindowUnit}
        display="fullWidth"
        errors={errors}
        onChangeWindowSize={(selectedWindowSize: number | undefined) =>
          setParam('timeWindowSize', selectedWindowSize)
        }
        onChangeWindowUnit={(selectedWindowUnit: string) =>
          setParam('timeWindowUnit', selectedWindowUnit)
        }
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
        onChangeSelectedValue={(updatedValue) => {
          setParam('size', updatedValue);
        }}
      />
      <EuiSpacer size="s" />
    </Fragment>
  );
};
