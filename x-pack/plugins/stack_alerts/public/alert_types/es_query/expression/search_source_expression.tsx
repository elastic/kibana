/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import './search_source_expression.scss';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSpacer,
  EuiTitle,
  EuiExpression,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Filter, ISearchSource } from '@kbn/data-plugin/common';
import {
  ForLastExpression,
  RuleTypeParamsExpressionProps,
  ThresholdExpression,
  ValueExpression,
} from '@kbn/triggers-actions-ui-plugin/public';
import { DataViewOption, EsQueryAlertParams, SearchType } from '../types';
import { DEFAULT_VALUES } from '../constants';
import { DataViewSelectPopover } from '../../components/data_view_select_popover';
import { FiltersList } from '../../components/filters_list';
import { useTriggersAndActionsUiDeps } from '../util';

export const SearchSourceExpression = ({
  ruleParams,
  setRuleParams,
  setRuleProperty,
  errors,
}: RuleTypeParamsExpressionProps<EsQueryAlertParams<SearchType.searchSource>>) => {
  const {
    searchConfiguration,
    thresholdComparator,
    threshold,
    timeWindowSize,
    timeWindowUnit,
    size,
  } = ruleParams;
  const { data } = useTriggersAndActionsUiDeps();

  const searchSourceRef = useRef<ISearchSource>();
  const [paramsError, setParamsError] = useState<Error>();

  const [currentAlertParams, setCurrentAlertParams] = useState<
    EsQueryAlertParams<SearchType.searchSource>
  >({
    searchConfiguration,
    searchType: SearchType.searchSource,
    timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
    timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
    threshold: threshold ?? DEFAULT_VALUES.THRESHOLD,
    thresholdComparator: thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR,
    size: size ?? DEFAULT_VALUES.SIZE,
  });

  const setParam = useCallback(
    (paramField: string, paramValue: unknown) => {
      setCurrentAlertParams((currentParams) => ({
        ...currentParams,
        [paramField]: paramValue,
      }));
      setRuleParams(paramField, paramValue);
    },
    [setRuleParams]
  );

  useEffect(() => {
    setRuleProperty('params', currentAlertParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const initSearchSource = () =>
      data.search.searchSource
        .create(searchConfiguration)
        .then((searchSource) => (searchSourceRef.current = searchSource))
        .catch(setParamsError);

    initSearchSource();
  }, [data.search.searchSource, searchConfiguration, data.dataViews]);

  if (!searchSourceRef.current) {
    return <EuiEmptyPrompt title={<EuiLoadingSpinner size="xl" />} />;
  }

  if (paramsError) {
    return (
      <>
        <EuiCallOut color="danger" iconType="alert">
          <p>
            {paramsError || (
              <FormattedMessage
                id="xpack.stackAlerts.searchThreshold.ui.fetchError"
                defaultMessage="Error when fetching alert rule parameters"
              />
            )}
          </p>
        </EuiCallOut>
        <EuiSpacer size="s" />
      </>
    );
  }

  const usedSearchSource = searchSourceRef.current;
  const dataView = usedSearchSource.getField('index')!;
  const query = usedSearchSource.getField('query')!;
  const filters = ((usedSearchSource.getField('filter') as Filter[]) || []).filter(
    ({ meta }) => !meta.disabled
  );

  const onSelectDataView = ([selected]: DataViewOption[]) => {
    // type casting is safe, since id was set to ComboBox value
    data.dataViews.get(selected.value!).then((newDataView) => {
      const newSearchSource = usedSearchSource.createCopy();
      newSearchSource.setField('index', newDataView);
      setParam('searchConfiguration', newSearchSource);
    });
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
      {filters.length > 0 && (
        <EuiExpression
          className="dscExpressionParam searchSourceAlertFilters"
          title={'sas'}
          description={'Filter'}
          value={<FiltersList filters={filters} dataView={dataView} />}
          display="columns"
        />
      )}

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
