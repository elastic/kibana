/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Moment } from 'moment';
import { EuiDatePicker, EuiDatePickerRange, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import {
  useFormData,
  useFormContext,
  FieldHook,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import * as i18n from '../../translations';
import { getSelectedForDatePicker as getSelected } from '../../helpers/get_selected_for_date_picker';

interface DatePickerRangeFieldProps {
  fields: { startDate: FieldHook<string, string>; endDate: FieldHook<string, string> };
  showTimeSelect?: boolean;
  'data-test-subj'?: string;
}

export const DatePickerRangeField: React.FC<DatePickerRangeFieldProps> = React.memo(
  ({ fields, showTimeSelect = true, ...rest }) => {
    const { setFieldValue } = useFormContext();
    const [form] = useFormData({ watch: [fields.startDate.path, fields.endDate.path] });

    const startDate = getSelected(form, fields.startDate.path);
    const endDate = getSelected(form, fields.endDate.path);

    const onChange = useCallback(
      (currentDate: Moment | null, path: string) => {
        // convert the moment date back into a string if it's not null
        setFieldValue(path, currentDate ? currentDate.toISOString() : currentDate);
      },
      [setFieldValue]
    );
    const isInvalid = startDate.isAfter(endDate);

    return (
      <>
        <EuiFormRow label={fields.startDate.label} {...rest} fullWidth>
          <EuiDatePickerRange
            isInvalid={isInvalid}
            startDateControl={
              <EuiDatePicker
                selected={startDate}
                onChange={(date) => date && onChange(date, fields.startDate.path)}
                startDate={startDate}
                endDate={endDate}
                aria-label="Start date"
                showTimeSelect={showTimeSelect}
                minDate={startDate}
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
                minDate={startDate}
              />
            }
            fullWidth
          />
        </EuiFormRow>
        {isInvalid ? (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="danger">
              {i18n.CREATE_FORM_SCHEDULE_INVALID}
            </EuiText>
          </>
        ) : null}
      </>
    );
  }
);
DatePickerRangeField.displayName = 'DatePickerRangeField';
