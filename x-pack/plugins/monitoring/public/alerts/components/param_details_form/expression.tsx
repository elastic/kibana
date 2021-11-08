/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback } from 'react';
import { EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { DataPublicPluginStart } from 'src/plugins/data/public';
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
  alertParams: { [property: string]: any };
  setAlertParams: (property: string, value: any) => void;
  setAlertProperty: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  paramDetails: CommonAlertParamDetails;
  data: DataPublicPluginStart;
  config?: MonitoringConfig;
}

export const Expression: React.FC<Props> = (props) => {
  const { alertParams, paramDetails, setAlertParams, errors, config, data } = props;

  const { derivedIndexPattern } = useDerivedIndexPattern(data, config);

  const alertParamsUi = Object.keys(paramDetails).map((alertParamName) => {
    const details = paramDetails[alertParamName];
    const value = alertParams[alertParamName];

    switch (details?.type) {
      case AlertParamType.Duration:
        return (
          <AlertParamDuration
            key={alertParamName}
            name={alertParamName}
            duration={value}
            label={details?.label}
            errors={errors[alertParamName]}
            setAlertParams={setAlertParams}
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
            setAlertParams={setAlertParams}
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
            setAlertParams={setAlertParams}
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
            setAlertParams={setAlertParams}
          />
        );
    }
  });

  const onFilterChange = useCallback(
    (filter: string) => {
      setAlertParams('filterQueryText', filter);
      setAlertParams(
        'filterQuery',
        convertKueryToElasticSearchQuery(filter, derivedIndexPattern) || ''
      );
    },
    [setAlertParams, derivedIndexPattern]
  );

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const debouncedOnFilterChange = useCallback(debounce(onFilterChange, FILTER_TYPING_DEBOUNCE_MS), [
    onFilterChange,
  ]);

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
          <KueryBar
            value={alertParams.filterQueryText}
            derivedIndexPattern={derivedIndexPattern}
            onSubmit={onFilterChange}
            onChange={debouncedOnFilterChange}
          />
        </EuiFormRow>
        <EuiSpacer />
      </EuiForm>
    </Fragment>
  );
};

// for lazy loading
// eslint-disable-next-line import/no-default-export
export default Expression;
