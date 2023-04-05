/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import moment from 'moment';
import {
  Form,
  getUseField,
  useForm,
  useFormData,
  UseMultiFields,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';

import { FormProps, schema } from './schema';
import * as i18n from '../translations';
import { RecurringSchedule } from './recurring_schedule_form/recurring_schedule';
import { SubmitButton } from './submit_button';
import { convertToRRule } from '../helpers/convert_to_rrule';
import { useCreateMaintenanceWindow } from '../../../hooks/use_create_maintenance_window';
import { useUiSetting } from '../../../utils/kibana_react';
import { DatePickerRangeField } from './fields/date_picker_range_field';

const UseField = getUseField({ component: Field });

export interface CreateMaintenanceWindowFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  initialValue?: FormProps;
}

export const useTimeZone = (): string => {
  const timeZone = useUiSetting<string>('dateFormat:tz');
  return timeZone === 'Browser' ? moment.tz.guess() : timeZone;
};

export const CreateMaintenanceWindowForm = React.memo<CreateMaintenanceWindowFormProps>(
  ({ onCancel, onSuccess, initialValue }) => {
    const [defaultDateValue] = useState<string>(moment().toISOString());
    const timezone = useTimeZone();

    const { mutate: createMaintenanceWindow } = useCreateMaintenanceWindow();

    const submitMaintenanceWindow = useCallback(
      async (formData, isValid) => {
        if (isValid) {
          const startDate = moment(formData.startDate);
          const endDate = moment(formData.endDate);
          await createMaintenanceWindow(
            {
              title: formData.title,
              duration: endDate.diff(startDate),
              rRule: convertToRRule(startDate, timezone, formData.recurringSchedule),
            },
            { onSuccess }
          );
        }
      },
      [createMaintenanceWindow, onSuccess, timezone]
    );

    const { form } = useForm<FormProps>({
      defaultValue: initialValue,
      options: { stripEmptyFields: false },
      schema,
      onSubmit: submitMaintenanceWindow,
    });

    const [{ recurring }] = useFormData<FormProps>({
      form,
      watch: ['recurring'],
    });
    const isRecurring = recurring || false;

    return (
      <Form form={form}>
        <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
          <EuiFlexItem>
            <UseField
              path="title"
              componentProps={{
                'data-test-subj': 'title-field',
                euiFieldProps: {
                  autoFocus: true,
                },
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <UseMultiFields
                      fields={{
                        startDate: {
                          path: 'startDate',
                          config: {
                            label: i18n.CREATE_FORM_SCHEDULE,
                            defaultValue: defaultDateValue,
                            validations: [],
                          },
                        },
                        endDate: {
                          path: 'endDate',
                          config: {
                            label: '',
                            defaultValue: defaultDateValue,
                            validations: [],
                          },
                        },
                      }}
                    >
                      {(fields) => (
                        <DatePickerRangeField fields={fields} data-test-subj="date-field" />
                      )}
                    </UseMultiFields>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <UseField
                  path="recurring"
                  componentProps={{
                    'data-test-subj': 'recurring-field',
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                {isRecurring ? <RecurringSchedule data-test-subj="recurring-form" /> : null}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="xl" />
        <EuiFlexGroup
          alignItems="center"
          justifyContent="flexEnd"
          gutterSize="l"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel} size="s">
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SubmitButton />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Form>
    );
  }
);
CreateMaintenanceWindowForm.displayName = 'CreateMaintenanceWindowForm';
