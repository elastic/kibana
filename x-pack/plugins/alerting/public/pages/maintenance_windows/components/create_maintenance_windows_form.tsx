/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
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
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { TIMEZONE_OPTIONS as UI_TIMEZONE_OPTIONS } from '@kbn/core-ui-settings-common';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';

import { FormProps, schema } from './schema';
import * as i18n from '../translations';
import { RecurringSchedule } from './recurring_schedule_form/recurring_schedule';
import { SubmitButton } from './submit_button';
import { convertToRRule } from '../helpers/convert_to_rrule';
import { useCreateMaintenanceWindow } from '../../../hooks/use_create_maintenance_window';
import { useUpdateMaintenanceWindow } from '../../../hooks/use_update_maintenance_window';
import { useGetRuleTypes } from '../../../hooks/use_get_rule_types';
import { useUiSetting } from '../../../utils/kibana_react';
import { DatePickerRangeField } from './fields/date_picker_range_field';
import { useArchiveMaintenanceWindow } from '../../../hooks/use_archive_maintenance_window';
import { MaintenanceWindowCategorySelection } from './maintenance_window_category_selection';

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
    const [isModalVisible, setIsModalVisible] = useState(false);
    const { defaultTimezone, isBrowser } = useDefaultTimezone();

    const isEditMode = initialValue !== undefined && maintenanceWindowId !== undefined;

    const hasSetInitialCategories = useRef<boolean>(false);

    const { mutate: createMaintenanceWindow, isLoading: isCreateLoading } =
      useCreateMaintenanceWindow();
    const { mutate: updateMaintenanceWindow, isLoading: isUpdateLoading } =
      useUpdateMaintenanceWindow();
    const { mutate: archiveMaintenanceWindow } = useArchiveMaintenanceWindow();

    const { data: ruleTypes, isLoading: isLoadingRuleTypes } = useGetRuleTypes();

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
            categoryIds: formData.categoryIds,
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

    const [{ recurring, timezone, categoryIds }, _, mounted] = useFormData<FormProps>({
      form,
      watch: ['recurring', 'timezone', 'categoryIds'],
    });
    const isRecurring = recurring || false;
    const showTimezone = isBrowser || initialValue?.timezone !== undefined;

    const closeModal = useCallback(() => setIsModalVisible(false), []);
    const showModal = useCallback(() => setIsModalVisible(true), []);

    const { setFieldValue } = form;

    const onCategoryIdsChange = useCallback(
      (id: string) => {
        if (!categoryIds) {
          return;
        }
        if (categoryIds.includes(id)) {
          setFieldValue(
            'categoryIds',
            categoryIds.filter((category) => category !== id)
          );
          return;
        }
        setFieldValue('categoryIds', [...categoryIds, id]);
      },
      [categoryIds, setFieldValue]
    );

    const modal = useMemo(() => {
      let m;
      if (isModalVisible) {
        m = (
          <EuiConfirmModal
            title={i18n.ARCHIVE_TITLE}
            onCancel={closeModal}
            onConfirm={() => {
              closeModal();
              archiveMaintenanceWindow(
                { maintenanceWindowId: maintenanceWindowId!, archive: true },
                { onSuccess }
              );
            }}
            cancelButtonText={i18n.CANCEL}
            confirmButtonText={i18n.ARCHIVE_TITLE}
            defaultFocusedButton="confirm"
            buttonColor="danger"
          >
            <p>{i18n.ARCHIVE_CALLOUT_SUBTITLE}</p>
          </EuiConfirmModal>
        );
      }
      return m;
    }, [closeModal, archiveMaintenanceWindow, isModalVisible, maintenanceWindowId, onSuccess]);

    const availableCategories = useMemo(() => {
      if (!ruleTypes) {
        return [];
      }
      return [...new Set(ruleTypes.map((ruleType) => ruleType.category))];
    }, [ruleTypes]);

    // For create mode, we want to initialize options to the rule type category the
    // user has access
    useEffect(() => {
      if (isEditMode) {
        return;
      }
      if (!mounted) {
        return;
      }
      if (hasSetInitialCategories.current) {
        return;
      }
      if (!ruleTypes) {
        return;
      }
      setFieldValue('categoryIds', [...new Set(ruleTypes.map((ruleType) => ruleType.category))]);
      hasSetInitialCategories.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditMode, ruleTypes, mounted]);

    // For edit mode, if a maintenance window => category_ids is not an array, this means
    // the maintenance window was created before the introduction of category filters.
    // For backwards compat we will initialize all options for these.
    useEffect(() => {
      if (!isEditMode) {
        return;
      }
      if (!mounted) {
        return;
      }
      if (hasSetInitialCategories.current) {
        return;
      }
      if (Array.isArray(categoryIds)) {
        return;
      }
      setFieldValue('categoryIds', [
        DEFAULT_APP_CATEGORIES.observability.id,
        DEFAULT_APP_CATEGORIES.security.id,
        DEFAULT_APP_CATEGORIES.management.id,
      ]);
      hasSetInitialCategories.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditMode, categoryIds, mounted]);

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
          <EuiSpacer size="xs" />
          <EuiFlexItem>
            <EuiText size="s">
              <h4>{i18n.CREATE_FORM_TIMEFRAME_TITLE}</h4>
              <p>
                <EuiTextColor color="subdued">
                  {i18n.CREATE_FORM_TIMEFRAME_DESCRIPTION}
                </EuiTextColor>
              </p>
            </EuiText>
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
                  {(fields) => (
                    <DatePickerRangeField
                      fields={fields}
                      timezone={timezone ?? [defaultTimezone]}
                      data-test-subj="date-field"
                    />
                  )}
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
          {isRecurring && (
            <EuiFlexItem>
              <RecurringSchedule data-test-subj="recurring-form" />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiHorizontalRule margin="xl" />
            <UseField path="categoryIds">
              {(field) => (
                <MaintenanceWindowCategorySelection
                  selectedCategories={categoryIds || []}
                  availableCategories={availableCategories}
                  isLoading={isLoadingRuleTypes}
                  errors={field.errors.map((error) => error.message)}
                  onChange={onCategoryIdsChange}
                />
              )}
            </UseField>
            <EuiHorizontalRule margin="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
        {isEditMode && (
          <>
            <EuiCallOut title={i18n.ARCHIVE_TITLE} color="danger" iconType="trash">
              <p>{i18n.ARCHIVE_SUBTITLE}</p>
              <EuiButton fill color="danger" onClick={showModal}>
                {i18n.ARCHIVE}
              </EuiButton>
              {modal}
            </EuiCallOut>
            <EuiHorizontalRule margin="xl" />
          </>
        )}
        <EuiFlexGroup
          alignItems="center"
          justifyContent="flexEnd"
          gutterSize="l"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel} size="s" data-test-subj="cancelMaintenanceWindow">
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
