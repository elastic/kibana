/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import moment from 'moment';
import { Moment } from 'moment';
import { EuiDatePicker, EuiFormRow } from '@elastic/eui';
import {
  useFormData,
  useFormContext,
  FieldHook,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { get } from 'lodash';

interface DateAndTimeFieldProps {
  field: FieldHook;
  isDisabled: boolean;
  showTimeSelect?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export const DateAndTimeField: React.FC<DateAndTimeFieldProps> = React.memo(
  ({ field, isDisabled, showTimeSelect = true, ...rest }) => {
    const { setFieldValue } = useFormContext();
    const [form] = useFormData({ watch: [field.path] });
    // parse from a string date to moment() if there is an intitial value
    // otherwise just get an initial date
    const selected = get(form, field.path) ? moment(get(form, field.path)) : moment();

    const onChange = useCallback(
      (currentDate: Moment | null) => {
        // convert the moment date back into a string if it's not null
        setFieldValue(field.path, currentDate ? currentDate.toISOString() : currentDate);
      },
      [setFieldValue, field.path]
    );

    return (
      <EuiFormRow label={field.label} isDisabled={isDisabled} {...rest} fullWidth>
        <EuiDatePicker
          showTimeSelect={showTimeSelect}
          selected={selected}
          onChange={onChange}
          minDate={selected}
        />
      </EuiFormRow>
    );
  }
);
DateAndTimeField.displayName = 'DateAndTimeField';
