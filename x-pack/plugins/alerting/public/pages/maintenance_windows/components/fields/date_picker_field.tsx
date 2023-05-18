/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import moment, { Moment } from 'moment';
import { EuiDatePicker, EuiFormRow } from '@elastic/eui';
import {
  useFormData,
  useFormContext,
  FieldHook,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getSelectedForDatePicker as getSelected } from '../../helpers/get_selected_for_date_picker';

interface DatePickerFieldProps {
  field: FieldHook;
  showTimeSelect?: boolean;
  'data-test-subj'?: string;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = React.memo(
  ({ field, showTimeSelect = true, ...rest }) => {
    const [today] = useState<Moment>(moment());

    const { setFieldValue } = useFormContext();
    const [form] = useFormData({ watch: [field.path] });

    const { selected, utcOffset } = getSelected(form, field.path);

    const onChange = useCallback(
      (currentDate: Moment | null) => {
        // convert the moment date back into a string if it's not null
        setFieldValue(field.path, currentDate ? currentDate.toISOString() : currentDate);
      },
      [setFieldValue, field.path]
    );

    return (
      <EuiFormRow label={field.label} {...rest} fullWidth>
        <EuiDatePicker
          showTimeSelect={showTimeSelect}
          selected={selected}
          onChange={onChange}
          minDate={today}
          utcOffset={utcOffset}
          fullWidth
        />
      </EuiFormRow>
    );
  }
);
DatePickerField.displayName = 'DatePickerField';
