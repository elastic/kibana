/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import moment from 'moment';
import {
  FIELD_TYPES,
  Form,
  getUseField,
  useForm,
  useFormData,
  UseMultiFields,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiHorizontalRule,
} from '@elastic/eui';
import { TIMEZONE_OPTIONS as UI_TIMEZONE_OPTIONS } from '@kbn/core-ui-settings-common';

import { FormProps, schema } from './schema';
import * as i18n from '../translations';
import { RecurringSchedule } from './recurring_schedule_form/recurring_schedule';
import { SubmitButton } from './submit_button';
import { convertToRRule } from '../helpers/convert_to_rrule';
import { useCreateMaintenanceWindow } from '../../../hooks/use_create_maintenance_window';
import { useUpdateMaintenanceWindow } from '../../../hooks/use_update_maintenance_window';
import { useUiSetting } from '../../../utils/kibana_react';
import { DatePickerRangeField } from './fields/date_picker_range_field';

const UseField = getUseField({ component: Field });

export interface CreateMaintenanceWindowFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  initialValue?: FormProps;
  maintenanceWindowId?: string;
}

const useDefaultTimezone = () => {
  const kibanaTz: string = useUiSetting('dateFormat:tz');
  if (!kibanaTz || kibanaTz === 'Browser') {
    return { defaultTimezone: moment.tz?.guess() ?? 'UTC', isBrowser: true };
  }
  return { defaultTimezone: kibanaTz, isBrowser: false };
};
const TIMEZONE_OPTIONS = UI_TIMEZONE_OPTIONS.map((n) => ({ label: n })) ?? [{ label: 'UTC' }];

export const CreateMaintenanceWindowForm = React.memo<CreateMaintenanceWindowFormProps>(
  ({ onCancel, onSuccess, initialValue, maintenanceWindowId }) => {
    const [defaultStartDateValue] = useState<string>(moment().toISOString());
    const [defaultEndDateValue] = useState<string>(moment().add(30, 'minutes').toISOString());
    const { defaultTimezone, isBrowser } = useDefaultTimezone();

    const isEditMode = initialValue !== undefined && maintenanceWindowId !== undefined;
    const { mutate: createMaintenanceWindow, isLoading: isCreateLoading } =
      useCreateMaintenanceWindow();
    const { mutate: updateMaintenanceWindow, isLoading: isUpdateLoading } =
      useUpdateMaintenanceWindow();

    const submitMaintenanceWindow = useCallback(
      async (formData, isValid) => {
        if (isValid) {
          const startDate = moment(formData.startDate);
          const endDate = moment(formData.endDate);
          const maintenanceWindow = {
            title: formData.title,
            duration: endDate.diff(startDate),
            rRule: convertToRRule(
              startDate,
              formData.timezone ? formData.timezone[0] : defaultTimezone,
              formData.recurringSchedule
            ),
          };
          if (isEditMode) {
            updateMaintenanceWindow({ maintenanceWindowId, maintenanceWindow }, { onSuccess });
          } else {
            createMaintenanceWindow(maintenanceWindow, { onSuccess });
          }
        }
      },
      [
        isEditMode,
        maintenanceWindowId,
        updateMaintenanceWindow,
        createMaintenanceWindow,
        onSuccess,
        defaultTimezone,
      ]
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
    const showTimezone = isBrowser || initialValue?.timezone !== undefined;

    return (
      <Form form={form}>
        <EuiFlexGroup direction="column" responsive={false}>
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
            <EuiFlexGroup alignItems="flexEnd" responsive={false}>
              <EuiFlexItem grow={3}>
                <UseMultiFields
                  fields={{
                    startDate: {
                      path: 'startDate',
                      config: {
                        label: i18n.CREATE_FORM_SCHEDULE,
                        defaultValue: defaultStartDateValue,
                        validations: [],
                      },
                    },
                    endDate: {
                      path: 'endDate',
                      config: {
                        label: '',
                        defaultValue: defaultEndDateValue,
                        validations: [],
                      },
                    },
                  }}
                >
                  {(fields) => <DatePickerRangeField fields={fields} data-test-subj="date-field" />}
                </UseMultiFields>
              </EuiFlexItem>
              {showTimezone ? (
                <EuiFlexItem grow={1}>
                  <UseField
                    path="timezone"
                    config={{
                      type: FIELD_TYPES.COMBO_BOX,
                      validations: [],
                      defaultValue: [defaultTimezone],
                    }}
                    componentProps={{
                      'data-test-subj': 'timezone-field',
                      id: 'timezone',
                      euiFieldProps: {
                        fullWidth: true,
                        options: TIMEZONE_OPTIONS,
                        singleSelection: { asPlainText: true },
                        isClearable: false,
                        noSuggestions: false,
                        placeholder: '',
                        prepend: (
                          <EuiFormLabel htmlFor={'timezone'}>
                            {i18n.CREATE_FORM_TIMEZONE}
                          </EuiFormLabel>
                        ),
                      },
                    }}
                  />
                </EuiFlexItem>
              ) : null}
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
            <SubmitButton isLoading={isCreateLoading || isUpdateLoading} editMode={isEditMode} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Form>
    );
  }
);
CreateMaintenanceWindowForm.displayName = 'CreateMaintenanceWindowForm';
