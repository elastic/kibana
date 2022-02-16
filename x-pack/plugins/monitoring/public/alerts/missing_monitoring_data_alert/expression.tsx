/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiForm, EuiSpacer } from '@elastic/eui';
import { CommonAlertParamDetails } from '../../../common/types/alerts';
import { AlertParamDuration } from '../flyout_expressions/alert_param_duration';
import { AlertParamType } from '../../../common/enums';
import { AlertParamPercentage } from '../flyout_expressions/alert_param_percentage';

export interface Props {
  alertParams: { [property: string]: any };
  setAlertParams: (property: string, value: any) => void;
  setAlertProperty: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  paramDetails: CommonAlertParamDetails;
}

export const Expression: React.FC<Props> = (props) => {
  const { alertParams, paramDetails, setAlertParams, errors } = props;

  const alertParamsUi = Object.keys(alertParams).map((alertParamName) => {
    const details = paramDetails[alertParamName];
    const value = alertParams[alertParamName];

    switch (details?.type) {
      case AlertParamType.Duration:
        return (
          <AlertParamDuration
            key={alertParamName}
            name={alertParamName}
            duration={value}
            label={details.label}
            errors={errors[alertParamName]}
            setAlertParams={setAlertParams}
          />
        );
      case AlertParamType.Percentage:
        return (
          <AlertParamPercentage
            key={alertParamName}
            name={alertParamName}
            label={details.label}
            percentage={value}
            errors={errors[alertParamName]}
            setAlertParams={setAlertParams}
          />
        );
    }
  });

  return (
    <Fragment>
      <EuiForm component="form">{alertParamsUi}</EuiForm>
      <EuiSpacer />
    </Fragment>
  );
};

// for lazy loading
// eslint-disable-next-line import/no-default-export
export default Expression;
