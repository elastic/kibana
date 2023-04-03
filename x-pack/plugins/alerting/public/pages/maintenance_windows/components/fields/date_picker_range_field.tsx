/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import moment from 'moment';
import { Moment } from 'moment';
import { EuiDatePicker, EuiDatePickerRange, EuiFormRow } from '@elastic/eui';
import {
  useFormData,
  useFormContext,
  FieldHook,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { get } from 'lodash';

interface DatePickerRangeFieldProps {
  fields: { startDate: FieldHook<string, string>; endDate: FieldHook<string, string> };
  showTimeSelect?: boolean;
  'data-test-subj'?: string;
}

export const DatePickerRangeField: React.FC<DatePickerRangeFieldProps> = React.memo(
  ({ fields, showTimeSelect = true, ...rest }) => {
    const { setFieldValue } = useFormContext();
    const [form] = useFormData({ watch: [fields.startDate.path, fields.endDate.path] });

    function getSelected(path: string) {
      // parse from a string date to moment() if there is an intitial value
      // otherwise just get the current date
      const initialValue = get(form, path);
      let selected = moment();
      if (initialValue && moment(initialValue).isValid()) {
        selected = moment(initialValue);
      }
      return selected;
    }

    const startDate = getSelected(fields.startDate.path);
    const endDate = getSelected(fields.endDate.path);

    const onChange = useCallback(
      (currentDate: Moment | null, path: string) => {
        // convert the moment date back into a string if it's not null
        setFieldValue(path, currentDate ? currentDate.toISOString() : currentDate);
      },
      [setFieldValue]
    );

    return (
      <EuiFormRow label={fields.startDate.label} {...rest} fullWidth>
        <EuiDatePickerRange
          isInvalid={startDate > endDate}
          startDateControl={
            <EuiDatePicker
              selected={startDate}
              onChange={(date) => date && onChange(date, fields.startDate.path)}
              startDate={startDate}
              endDate={endDate}
              aria-label="Start date"
              showTimeSelect={showTimeSelect}
            />
          }
          endDateControl={
            <EuiDatePicker
              selected={endDate}
              onChange={(date) => date && onChange(date, fields.endDate.path)}
              startDate={startDate}
              endDate={endDate}
              aria-label="End date"
              showTimeSelect={showTimeSelect}
            />
          }
          fullWidth
        />
      </EuiFormRow>
    );
  }
);
DatePickerRangeField.displayName = 'DatePickerRangeField';
