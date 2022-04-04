/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useState } from 'react';
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
import { Filter, ISearchSource } from '../../../../../../../src/plugins/data/common';
import { EsQueryAlertParams, SearchType } from '../types';
import {
  ForLastExpression,
  RuleTypeParamsExpressionProps,
  ThresholdExpression,
  ValueExpression,
} from '../../../../../triggers_actions_ui/public';
import { DEFAULT_VALUES } from '../constants';
import { ReadOnlyFilterItems } from './read_only_filter_items';

export const SearchSourceExpression = ({
  ruleParams,
  setRuleParams,
  setRuleProperty,
  data,
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
  const [usedSearchSource, setUsedSearchSource] = useState<ISearchSource | undefined>();
  const [paramsError, setParamsError] = useState<Error | undefined>();

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setRuleProperty('params', currentAlertParams), []);

  useEffect(() => {
    async function initSearchSource() {
      try {
        const loadedSearchSource = await data.search.searchSource.create(searchConfiguration);
        setUsedSearchSource(loadedSearchSource);
      } catch (error) {
        setParamsError(error);
      }
    }
    if (searchConfiguration) {
      initSearchSource();
    }
  }, [data.search.searchSource, searchConfiguration]);

  if (paramsError) {
    return (
      <>
        <EuiCallOut color="danger" iconType="alert">
          <p>{paramsError.message}</p>
        </EuiCallOut>
        <EuiSpacer size="s" />
      </>
    );
  }

  if (!usedSearchSource) {
    return <EuiEmptyPrompt title={<EuiLoadingSpinner size="xl" />} />;
  }

  const dataView = usedSearchSource.getField('index')!;
  const query = usedSearchSource.getField('query')!;
  const filters = (usedSearchSource.getField('filter') as Filter[]).filter(
    ({ meta }) => !meta.disabled
  );
  const dataViews = [dataView];
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
      <EuiExpression
        className="dscExpressionParam"
        description={'Data view'}
        value={dataView.title}
        display="columns"
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
          value={<ReadOnlyFilterItems filters={filters} indexPatterns={dataViews} />}
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
