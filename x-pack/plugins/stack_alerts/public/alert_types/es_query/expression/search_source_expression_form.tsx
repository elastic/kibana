/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useMemo, useReducer } from 'react';
import './search_source_expression.scss';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiTitle, EuiExpression, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Filter, DataView, Query, ISearchSource } from '@kbn/data-plugin/common';
import {
  ForLastExpression,
  IErrorObject,
  ThresholdExpression,
  ValueExpression,
} from '@kbn/triggers-actions-ui-plugin/public';
import { FilterAdd } from '@kbn/unified-search-plugin/public';
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
  payload: DataView | Filter | Query;
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
  const { searchSource, ruleParams, errors, setParam } = props;
  const { thresholdComparator, threshold, timeWindowSize, timeWindowUnit, size } = ruleParams;
  const { data } = useTriggersAndActionsUiDeps();

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
    (newFilters) => {
      // mutates new filter properties for migration purpose and further proper usage
      data.query.filterManager.setFilters(newFilters, false);
      dispatch({ type: 'filter', payload: newFilters });
    },
    [data.query.filterManager]
  );

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
      <EuiCallOut
        size="s"
        title={
          <FormattedMessage
            id="xpack.stackAlerts.searchThreshold.ui.notEditable"
            defaultMessage="The data view, query, and filter are initialized in Discover and cannot be edited."
          />
        }
        iconType="iInCircle"
      />
      <EuiSpacer size="s" />
      <DataViewSelectPopover
        selectedDataViewTitle={dataView.title}
        onSelectDataView={onSelectDataView}
      />
      {query.query !== '' && (
        <EuiExpression
          className="dscExpressionParam"
          description={'Query'}
          value={query.query}
          display="columns"
        />
      )}

      <EuiExpression
        className="dscExpressionParam searchSourceAlertFilters"
        title={'sas'}
        description={'Filter'}
        value={
          filters.length > 0 ? (
            <FiltersList filters={filters} dataView={dataView} onUpdateFilters={onUpdateFilters} />
          ) : (
            <FilterAdd dataViews={dataViews} onAdd={() => {}} />
          )
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
