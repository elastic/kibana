/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback } from 'react';
import { EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { debounce } from 'lodash';
import { i18n } from '@kbn/i18n';
import { CommonAlertParamDetails } from '../../../../common/types/alerts';
import { AlertParamDuration } from '../../flyout_expressions/alert_param_duration';
import { AlertParamType } from '../../../../common/enums';
import { AlertParamPercentage } from '../../flyout_expressions/alert_param_percentage';
import { AlertParamNumber } from '../../flyout_expressions/alert_param_number';
import { AlertParamTextField } from '../../flyout_expressions/alert_param_textfield';
import { MonitoringConfig } from '../../../types';
import { useDerivedIndexPattern } from './use_derived_index_pattern';
import { KueryBar } from '../../../components/kuery_bar';
import { convertKueryToElasticSearchQuery } from '../../../lib/kuery';

const FILTER_TYPING_DEBOUNCE_MS = 500;

export interface Props {
  ruleParams: { [property: string]: any };
  setRuleParams: (property: string, value: any) => void;
  setRuleProperty: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  paramDetails: CommonAlertParamDetails;
  dataViews: DataViewsPublicPluginStart;
  config?: MonitoringConfig;
}

export const Expression: React.FC<Props> = (props) => {
  const { ruleParams, paramDetails, setRuleParams, errors, config, dataViews } = props;

  const { derivedIndexPattern } = useDerivedIndexPattern(dataViews, config);

  const alertParamsUi = Object.keys(paramDetails).map((alertParamName) => {
    const details = paramDetails[alertParamName];
    const value = ruleParams[alertParamName];

    switch (details?.type) {
      case AlertParamType.Duration:
        return (
          <AlertParamDuration
            key={alertParamName}
            name={alertParamName}
            duration={value}
            label={details?.label}
            errors={errors[alertParamName]}
            setRuleParams={setRuleParams}
          />
        );
      case AlertParamType.Percentage:
        return (
          <AlertParamPercentage
            key={alertParamName}
            name={alertParamName}
            label={details?.label}
            percentage={value}
            errors={errors[alertParamName]}
            setRuleParams={setRuleParams}
          />
        );
      case AlertParamType.Number:
        return (
          <AlertParamNumber
            key={alertParamName}
            name={alertParamName}
            details={details}
            value={value}
            errors={errors[alertParamName]}
            setRuleParams={setRuleParams}
          />
        );
      case AlertParamType.TextField:
        return (
          <AlertParamTextField
            key={alertParamName}
            name={alertParamName}
            label={details?.label}
            value={value}
            errors={errors[alertParamName]}
            setRuleParams={setRuleParams}
          />
        );
    }
  });

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
    <Fragment>
      <EuiForm component="form">
        {alertParamsUi}
        <EuiSpacer />
        <EuiFormRow
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
    </Fragment>
  );
};

// for lazy loading
// eslint-disable-next-line import/no-default-export
export default Expression;
