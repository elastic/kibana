/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { debounce } from 'lodash';
import { EuiSpacer, EuiForm, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDerivedIndexPattern } from '../components/param_details_form/use_derived_index_pattern';
import { convertKueryToElasticSearchQuery } from '../../lib/kuery';
import { KueryBar } from '../../components/kuery_bar';
import { Props } from '../components/param_details_form/expression';

const FILTER_TYPING_DEBOUNCE_MS = 500;

export const Expression = ({ ruleParams, config, setRuleParams, dataViews }: Props) => {
  const { derivedIndexPattern } = useDerivedIndexPattern(dataViews, config);
  const onFilterChange = useCallback(
    (filter: string) => {
      if (derivedIndexPattern) setRuleParams('filterQueryText', filter);
      if (derivedIndexPattern)
        setRuleParams(
          'filterQuery',
          convertKueryToElasticSearchQuery(filter, derivedIndexPattern) || ''
        );
    },
    [setRuleParams, derivedIndexPattern]
  );

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const debouncedOnFilterChange = useCallback(debounce(onFilterChange, FILTER_TYPING_DEBOUNCE_MS), [
    onFilterChange,
  ]);

  const kueryBar = derivedIndexPattern ? (
    <KueryBar
      value={ruleParams.filterQueryText}
      derivedIndexPattern={derivedIndexPattern}
      onSubmit={onFilterChange}
      onChange={debouncedOnFilterChange}
    />
  ) : (
    <></>
  );

  return (
    <EuiForm component="form">
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.monitoring.alerts.filterLable', {
          defaultMessage: 'Filter',
        })}
        helpText={i18n.translate('xpack.monitoring.alerts.filterHelpText', {
          defaultMessage: 'Use a KQL expression to limit the scope of your alert trigger.',
        })}
      >
        {kueryBar}
      </EuiFormRow>
      <EuiSpacer />
    </EuiForm>
  );
};

// for lazy loading
// eslint-disable-next-line import/no-default-export
export default Expression;
