/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useState } from 'react';
import './search_source_threshold_expression.scss';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiTitle, EuiExpression, EuiPopover, EuiText } from '@elastic/eui';
import { Filter, ISearchSource } from '../../../../../../src/plugins/data/common';
import { QueryStringInput } from '../../../../../../src/plugins/data/public';
import { EsQueryAlertParams } from './types';
import {
  ForLastExpression,
  RuleTypeParamsExpressionProps,
  ThresholdExpression,
} from '../../../../triggers_actions_ui/public';
import { DEFAULT_VALUES } from './constants';
import { ReadOnlyFilterItems } from '../components/read_only_filter_items';

export const SearchSourceThresholdExpression = ({
  ruleParams,
  setRuleParams,
  setRuleProperty,
  data,
  errors,
}: RuleTypeParamsExpressionProps<EsQueryAlertParams>) => {
  const { thresholdComparator, threshold, timeWindowSize, timeWindowUnit } = ruleParams;

  const getDefaultParams = () => {
    const defaults = {
      timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
      timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
      threshold: threshold ?? DEFAULT_VALUES.THRESHOLD,
      thresholdComparator: thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR,
    };

    return { ...ruleParams, ...defaults, searchType: 'searchSource' };
  };

  const [currentAlertParams, setCurrentAlertParams] = useState<EsQueryAlertParams>(
    getDefaultParams()
  );

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

  const [usedSearchSource, setUsedSearchSource] = useState<ISearchSource | undefined>();

  const { searchConfiguration } = ruleParams;

  // Note that this PR contains a limited way to edit query and filter
  // But it's out of scope for the MVP
  const [showQueryBar, setShowQueryBar] = useState<boolean>(false);
  const [showFilter, setShowFilter] = useState<boolean>(false);

  useEffect(() => {
    async function initSearchSource() {
      const loadedSearchSource = await data.search.searchSource.create(searchConfiguration);
      setUsedSearchSource(loadedSearchSource);
    }
    if (searchConfiguration) {
      initSearchSource();
    }
  }, [data.search.searchSource, searchConfiguration]);

  if (!usedSearchSource) {
    // there should be a loading indicator
    return null;
  }

  const filters = (usedSearchSource.getField('filter') as Filter[]).filter(
    ({ meta }) => !meta.disabled
  );

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.searchThreshold.ui.conditionPrompt"
            defaultMessage="When the number of documents matching"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiExpression
        description={'Data view'}
        value={usedSearchSource.getField('index')!.title}
        isActive={true}
        display="columns"
      />
      <EuiPopover
        button={
          <EuiExpression
            description={'Query'}
            value={usedSearchSource.getField('query')!.query}
            isActive={true}
            display="columns"
          />
        }
        display="block"
        isOpen={showQueryBar}
        closePopover={() => setShowQueryBar(false)}
      >
        <QueryStringInput
          indexPatterns={[usedSearchSource.getField('index')!]}
          query={usedSearchSource.getField('query')!}
          onChange={(query) => {
            usedSearchSource.setField('query', query);
            setUsedSearchSource(usedSearchSource.createCopy());
          }}
        />
      </EuiPopover>
      <EuiSpacer size="s" />
      <EuiPopover
        button={
          <EuiExpression
            className="searchSourceAlertFilters"
            title={'sas'}
            description={'Filter'}
            value={
              <ReadOnlyFilterItems
                filters={filters}
                indexPatterns={[usedSearchSource.getField('index')!]}
              />
            }
            isActive={true}
            display="columns"
          />
        }
        display="block"
        isOpen={showFilter}
        closePopover={() => setShowFilter(false)}
      />
      <EuiText size="xs">
        <FormattedMessage
          id="xpack.stackAlerts.searchThreshold.ui.notEditable"
          defaultMessage="Note that data view, query, filter are currently not editable"
        />
      </EuiText>
      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.conditionPrompt"
            defaultMessage="When number of matches"
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
      <EuiSpacer />
    </Fragment>
  );
};
