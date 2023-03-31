/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import moment from 'moment';
import {
  Form,
  getUseField,
  useForm,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';

import { FormProps, schema } from './schema';
import * as i18n from '../translations';
import { RecurringSchedule } from './recurring_schedule_form/recurring_schedule';
import { DateAndTimeField } from './fields/date_and_time_field';
import { SubmitButton } from './submit_button';
import { convertToRRule } from '../helpers/convert_to_rrule';
import { useCreateMaintenanceWindow } from '../../../hooks/use_create_maintenance_window';
import { useUiSetting } from '../../../utils/kibana_react';

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
    const timezone = useTimeZone();

    const { mutate: createMaintenanceWindow } = useCreateMaintenanceWindow();

    const submitMaintenanceWindow = useCallback(
      async ({ fields, ...data }, isValid) => {
        if (isValid) {
          const { ...formData } = data;
          await createMaintenanceWindow(
            {
              title: formData.title,
              duration: formData.duration,
              rRule: convertToRRule(moment(formData.date), timezone, formData.recurringSchedule),
            },
            { onSuccess }
          );
        }
      },
      [createMaintenanceWindow, onSuccess, timezone]
    );

    const { form } = useForm<FormProps>({
      defaultValue: { ...initialValue },
      options: { stripEmptyFields: false },
      schema,
      onSubmit: submitMaintenanceWindow,
    });

    const [{ recurring }] = useFormData({
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
                  fullWidth: true,
                },
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem grow={4}>
                    <UseField
                      path="date"
                      component={DateAndTimeField}
                      componentProps={{
                        'data-test-subj': 'date-field',
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={2}>
                    <UseField
                      path="duration"
                      componentProps={{
                        'data-test-subj': 'duration-field',
                        euiFieldProps: {
                          autoFocus: false,
                          fullWidth: false,
                          type: 'number',
                          min: 1,
                          max: 24,
                          append: i18n.CREATE_FORM_DURATION_HOURS,
                        },
                      }}
                    />
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
