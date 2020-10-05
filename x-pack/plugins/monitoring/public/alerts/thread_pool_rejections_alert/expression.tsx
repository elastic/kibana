/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiForm, EuiSpacer } from '@elastic/eui';
import { AlertParamNumberToggle } from '../flyout_expressions/alert_param_number_toggle';

import { Props } from '.';

export const Expression: React.FC<Props> = (props) => {
  const { alertParams, paramDetails, setAlertParams, errors } = props;
  const alertParamsUi = Object.keys(alertParams).map((name) => {
    const { label } = paramDetails[name];
    const { threshold: value, enabled } = alertParams[name] as {
      threshold: number;
      enabled: boolean;
    };
    const initialState = {
      value,
      enabled,
    };

    return (
      <AlertParamNumberToggle
        key={name}
        {...{
          initialState,
          name,
          label,
          setAlertParams: (paramName, newState) => {
            setAlertParams(paramName, {
              threshold: newState.value,
              enabled: newState.enabled,
            });
          },
          errors: errors[name] as string[],
        }}
      />
    );
  });

  return (
    <Fragment>
      <EuiSpacer />
      <EuiForm component="form">{alertParamsUi}</EuiForm>
      <EuiSpacer />
    </Fragment>
  );
};
