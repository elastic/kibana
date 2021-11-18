/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiCallOut, EuiTitle, EuiExpression, EuiPopover } from '@elastic/eui';
import {
  COMPARATORS,
  ThresholdExpression,
  ForLastExpression,
  AlertTypeParamsExpressionProps,
} from '../../../../triggers_actions_ui/public';
import { IndexThresholdAlertParams } from './types';
import './expression.scss';
import {
  Filter,
  ISearchSource,
  SearchSourceFields,
} from '../../../../../../src/plugins/data/common';
import { QueryStringInput } from '../../../../../../src/plugins/data/public';
import { FilterBar } from '../../../../../../src/plugins/data/public';

export const DEFAULT_VALUES = {
  AGGREGATION_TYPE: 'count',
  TERM_SIZE: 5,
  THRESHOLD_COMPARATOR: COMPARATORS.GREATER_THAN,
  TIME_WINDOW_SIZE: 5,
  TIME_WINDOW_UNIT: 'm',
  THRESHOLD: [1000],
  GROUP_BY: 'all',
};

const expressionFieldsWithValidation = ['threshold0', 'threshold1', 'timeWindowSize'];

export const IndexThresholdAlertTypeExpression: React.FunctionComponent<
  AlertTypeParamsExpressionProps<IndexThresholdAlertParams>
> = ({ alertParams, setAlertParams, setAlertProperty, errors, data }) => {
  const { thresholdComparator, threshold, timeWindowSize, timeWindowUnit, searchSourceFields } =
    alertParams;
  const [usedSearchSource, setUsedSearchSource] = useState<ISearchSource | undefined>();
  const [showQueryBar, setShowQueryBar] = useState<boolean>(false);
  const [showFilter, setShowFilter] = useState<boolean>(false);

  useEffect(() => {
    async function getSearchSource() {
      const loadedSearchSource = await data.search.searchSource.create(
        searchSourceFields as SearchSourceFields
      );
      setUsedSearchSource(loadedSearchSource);
    }
    if (searchSourceFields) {
      getSearchSource();
    }
  }, [data.search.searchSource, searchSourceFields]);

  const hasExpressionErrors = !!Object.keys(errors).find(
    (errorKey) =>
      expressionFieldsWithValidation.includes(errorKey) &&
      errors[errorKey].length >= 1 &&
      alertParams[errorKey as keyof IndexThresholdAlertParams] !== undefined
  );

  const expressionErrorMessage = i18n.translate(
    'xpack.stackAlerts.threshold.ui.alertParams.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  const setDefaultExpressionValues = async () => {
    setAlertProperty('params', {
      thresholdComparator: thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR,
      timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
      timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
      threshold: threshold ?? DEFAULT_VALUES.THRESHOLD,
      searchSourceFields: searchSourceFields ?? {},
    });
  };

  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!searchSourceFields) {
    <EuiCallOut color="danger" size="s" title={`Please go to Discover to create an alert`} />;
  }

  if (!usedSearchSource) {
    return null;
  }
  const filterArr = usedSearchSource!.getField('filter') as Filter[];
  // @ts-ignore
  return (
    <>
      {hasExpressionErrors ? (
        <Fragment>
          <EuiSpacer />
          <EuiCallOut color="danger" size="s" title={expressionErrorMessage} />
          <EuiSpacer />
        </Fragment>
      ) : null}
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.threshold.ui.conditionPrompt"
            defaultMessage="When the number of documents matching"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiExpression
        description={'Data view'}
        value={usedSearchSource!.getField('index')!.title}
        isActive={true}
        display="columns"
      />
      <EuiPopover
        button={
          <EuiExpression
            description={'Query'}
            value={usedSearchSource!.getField('query')!.query}
            isActive={true}
            display="columns"
            onClick={() => setShowQueryBar(!showQueryBar)}
          />
        }
        display="block"
        isOpen={showQueryBar}
      >
        <QueryStringInput
          indexPatterns={[usedSearchSource!.getField('index')!]}
          query={usedSearchSource!.getField('query')!}
          onChange={(query) => {
            usedSearchSource.setField('query', query);
          }}
        />
      </EuiPopover>
      <EuiSpacer size="s" />

      <EuiPopover
        button={
          <EuiExpression
            description={'Filter'}
            value={
              filterArr
                ? filterArr
                    .map((filter: Filter) => {
                      return filter.meta.key;
                    })
                    .join(', ')
                : ''
            }
            isActive={true}
            display="columns"
            onClick={() => setShowFilter(!showFilter)}
          />
        }
        display="block"
        isOpen={showFilter}
      >
        <FilterBar
          filters={filterArr}
          appName="discover"
          className={''}
          intl={{} as never}
          indexPatterns={[usedSearchSource!.getField('index')!]}
          onFiltersUpdated={(filters) => {
            usedSearchSource.setField('filter', filters);
          }}
        />
      </EuiPopover>

      <EuiSpacer size="s" />

      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.threshold.ui.conditionPrompt"
            defaultMessage="Define the condition"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ThresholdExpression
        thresholdComparator={thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR}
        threshold={threshold}
        data-test-subj="thresholdExpression"
        errors={errors}
        display="fullWidth"
        popupPosition={'upLeft'}
        onChangeSelectedThreshold={(selectedThresholds) =>
          setAlertParams('threshold', selectedThresholds)
        }
        onChangeSelectedThresholdComparator={(selectedThresholdComparator) =>
          setAlertParams('thresholdComparator', selectedThresholdComparator)
        }
      />
      <EuiSpacer size="s" />
      <ForLastExpression
        data-test-subj="forLastExpression"
        popupPosition={'upLeft'}
        timeWindowSize={timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE}
        timeWindowUnit={timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT}
        display="fullWidth"
        errors={errors}
        onChangeWindowSize={(selectedWindowSize: number | undefined) =>
          setAlertParams('timeWindowSize', selectedWindowSize)
        }
        onChangeWindowUnit={(selectedWindowUnit: string) =>
          setAlertParams('timeWindowUnit', selectedWindowUnit)
        }
      />
      <EuiSpacer />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { IndexThresholdAlertTypeExpression as default };
