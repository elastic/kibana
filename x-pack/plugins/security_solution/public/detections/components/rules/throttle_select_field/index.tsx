/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';

import {
  NOTIFICATION_THROTTLE_RULE,
  NOTIFICATION_THROTTLE_NO_ACTIONS,
} from '../../../../../common/constants';
import { SelectField } from '../../../../shared_imports';

export const THROTTLE_OPTIONS = [
  { value: NOTIFICATION_THROTTLE_NO_ACTIONS, text: 'Perform no actions' },
  { value: NOTIFICATION_THROTTLE_RULE, text: 'On each rule execution' },
  { value: '1h', text: 'Hourly' },
  { value: '1d', text: 'Daily' },
  { value: '7d', text: 'Weekly' },
];

export const DEFAULT_THROTTLE_OPTION = THROTTLE_OPTIONS[0];

type ThrottleSelectField = typeof SelectField;

export const ThrottleSelectField: ThrottleSelectField = (props) => {
  const onChange = useCallback(
    (e) => {
      const throttle = e.target.value;
      props.field.setValue(throttle);
      props.handleChange(throttle);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.field.setValue, props.handleChange]
  );
  const newEuiFieldProps = { ...props.euiFieldProps, onChange };
  return <SelectField {...props} euiFieldProps={newEuiFieldProps} />;
};
