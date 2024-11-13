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
  FormSubmitHandler,
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
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import type { Filter } from '@kbn/es-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { KibanaServerError } from '@kbn/kibana-utils-plugin/public';
import { FormProps, schema } from './schema';
import * as i18n from '../translations';
import { RecurringSchedule } from './recurring_schedule_form/recurring_schedule';
import { SubmitButton } from './submit_button';
import { convertToRRule } from '../helpers/convert_to_rrule';
import { isScopedQueryError } from '../../../../common';
import { useCreateMaintenanceWindow } from '../../../hooks/use_create_maintenance_window';
import { useUpdateMaintenanceWindow } from '../../../hooks/use_update_maintenance_window';
import { useGetRuleTypes } from '../../../hooks/use_get_rule_types';
import { useUiSetting } from '../../../utils/kibana_react';
import { DatePickerRangeField } from './fields/date_picker_range_field';
import { useArchiveMaintenanceWindow } from '../../../hooks/use_archive_maintenance_window';
import { MaintenanceWindowCategorySelection } from './maintenance_window_category_selection';
import { MaintenanceWindowScopedQuerySwitch } from './maintenance_window_scoped_query_switch';
import { MaintenanceWindowScopedQuery } from './maintenance_window_scoped_query';

const UseField = getUseField({ component: Field });

const VALID_CATEGORIES = [
  DEFAULT_APP_CATEGORIES.observability.id,
  DEFAULT_APP_CATEGORIES.security.id,
  DEFAULT_APP_CATEGORIES.management.id,
];

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

export const CreateMaintenanceWindowForm = React.memo<CreateMaintenanceWindowFormProps>((props) => {
  const { onCancel, onSuccess, initialValue, maintenanceWindowId } = props;

  const [defaultStartDateValue] = useState<string>(moment().toISOString());
  const [defaultEndDateValue] = useState<string>(moment().add(30, 'minutes').toISOString());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { defaultTimezone, isBrowser } = useDefaultTimezone();

  const [isScopedQueryEnabled, setIsScopedQueryEnabled] = useState(!!initialValue?.scopedQuery);
  const [query, setQuery] = useState<string>(initialValue?.scopedQuery?.kql || '');
  const [filters, setFilters] = useState<Filter[]>(
    (initialValue?.scopedQuery?.filters as Filter[]) || []
  );
  const [scopedQueryErrors, setScopedQueryErrors] = useState<string[]>([]);
  const hasSetInitialCategories = useRef<boolean>(false);
  const categoryIdsHistory = useRef<string[]>([]);

  const isEditMode = initialValue !== undefined && maintenanceWindowId !== undefined;

  const onCreateOrUpdateError = useCallback((error: IHttpFetchError<KibanaServerError>) => {
    if (!error.body?.message) {
      return;
    }
    if (isScopedQueryError(error.body.message)) {
      setScopedQueryErrors([i18n.CREATE_FORM_SCOPED_QUERY_INVALID_ERROR_MESSAGE]);
    }
  }, []);

  const { mutate: createMaintenanceWindow, isLoading: isCreateLoading } =
    useCreateMaintenanceWindow({
      onError: onCreateOrUpdateError,
    });

  const { mutate: updateMaintenanceWindow, isLoading: isUpdateLoading } =
    useUpdateMaintenanceWindow({
      onError: onCreateOrUpdateError,
    });

  const { mutate: archiveMaintenanceWindow } = useArchiveMaintenanceWindow();

  const { data: ruleTypes, isLoading: isLoadingRuleTypes } = useGetRuleTypes();

  const transformQueryFilters = (filtersToTransform: Filter[]): Filter[] => {
    return filtersToTransform.map((filter) => {
      const { $state, meta, ...rest } = filter;
      return {
        $state,
        meta,
        query: filter?.query ? { ...filter.query } : { ...rest },
      };
    });
  };

  const scopedQueryPayload = useMemo(() => {
    if (!isScopedQueryEnabled) {
      return null;
    }
    if (!query && !filters.length) {
      return null;
    }

    // Wrapping filters in query object here to avoid schema validation failure
    const transformedFilters = transformQueryFilters(filters);

    return {
      kql: query,
      filters: transformedFilters,
    };
  }, [isScopedQueryEnabled, query, filters]);

  const submitMaintenanceWindow = useCallback<FormSubmitHandler<FormProps>>(
    async (formData, isValid) => {
      if (!isValid || scopedQueryErrors.length !== 0) {
        return;
      }

      if (isScopedQueryEnabled && !scopedQueryPayload) {
        setScopedQueryErrors([i18n.CREATE_FORM_SCOPED_QUERY_EMPTY_ERROR_MESSAGE]);
        return;
      }

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
        scopedQuery: scopedQueryPayload,
      };

      if (isEditMode) {
        updateMaintenanceWindow(
          { maintenanceWindowId, updateParams: maintenanceWindow },
          { onSuccess }
        );
      } else {
        createMaintenanceWindow(maintenanceWindow, { onSuccess });
      }
    },
    [
      isEditMode,
      isScopedQueryEnabled,
      scopedQueryErrors,
      maintenanceWindowId,
      updateMaintenanceWindow,
      createMaintenanceWindow,
      onSuccess,
      defaultTimezone,
      scopedQueryPayload,
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
    watch: ['recurring', 'timezone', 'categoryIds', 'scopedQuery'],
  });
  const isRecurring = recurring || false;
  const showTimezone = isBrowser || initialValue?.timezone !== undefined;

  const closeModal = useCallback(() => setIsModalVisible(false), []);
  const showModal = useCallback(() => setIsModalVisible(true), []);

  const { setFieldValue } = form;

  const validRuleTypes = useMemo(() => {
    if (!ruleTypes) {
      return [];
    }
    return ruleTypes.filter((ruleType) => VALID_CATEGORIES.includes(ruleType.category));
  }, [ruleTypes]);

  const availableCategories = useMemo(() => {
    return [...new Set(validRuleTypes.map((ruleType) => ruleType.category))];
  }, [validRuleTypes]);

  const featureIds = useMemo(() => {
    if (!Array.isArray(validRuleTypes) || !Array.isArray(categoryIds) || !mounted) {
      return [];
    }

    const featureIdsSet = new Set<ValidFeatureId>();

    validRuleTypes.forEach((ruleType) => {
      if (categoryIds.includes(ruleType.category)) {
        featureIdsSet.add(ruleType.producer as ValidFeatureId);
      }
    });

    return [...featureIdsSet];
  }, [validRuleTypes, categoryIds, mounted]);

  const onCategoryIdsChange = useCallback(
    (ids: string[]) => {
      if (!categoryIds) {
        return;
      }
      setFieldValue('categoryIds', ids);
    },
    [categoryIds, setFieldValue]
  );

  const onScopeQueryToggle = useCallback(
    (isEnabled: boolean) => {
      if (isEnabled) {
        setFieldValue('categoryIds', [categoryIds?.sort()[0] || availableCategories.sort()[0]]);
      } else {
        setFieldValue('categoryIds', categoryIdsHistory.current);
      }
      setIsScopedQueryEnabled(isEnabled);
    },
    [categoryIds, availableCategories, setFieldValue]
  );

  const onQueryChange = useCallback(
    (newQuery: string) => {
      if (scopedQueryErrors.length) {
        setScopedQueryErrors([]);
      }
      setQuery(newQuery);
    },
    [scopedQueryErrors]
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
    if (!validRuleTypes.length) {
      return;
    }
    setFieldValue('categoryIds', [...new Set(validRuleTypes.map((ruleType) => ruleType.category))]);
    hasSetInitialCategories.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, validRuleTypes, mounted]);

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
    setFieldValue('categoryIds', VALID_CATEGORIES);
    hasSetInitialCategories.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, categoryIds, mounted]);

  useEffect(() => {
    if (!isScopedQueryEnabled && Array.isArray(categoryIds)) {
      categoryIdsHistory.current = categoryIds;
    }
  }, [categoryIds, isScopedQueryEnabled]);

  return (
    <Form form={form} data-test-subj="createMaintenanceWindowForm">
      <EuiFlexGroup direction="column" responsive={false}>
        <EuiFlexItem>
          <UseField
            path="title"
            componentProps={{
              'data-test-subj': 'title-field',
              euiFieldProps: {
                'data-test-subj': 'createMaintenanceWindowFormNameInput',
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
              <EuiTextColor color="subdued">{i18n.CREATE_FORM_TIMEFRAME_DESCRIPTION}</EuiTextColor>
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
              euiFieldProps: {
                'data-test-subj': 'createMaintenanceWindowRepeatSwitch',
              },
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
          <UseField path="scopedQuery">
            {() => (
              <MaintenanceWindowScopedQuerySwitch
                checked={isScopedQueryEnabled}
                onEnabledChange={onScopeQueryToggle}
              />
            )}
          </UseField>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule margin="xl" />
          <UseField path="categoryIds">
            {(field) => (
              <MaintenanceWindowCategorySelection
                isScopedQueryEnabled={isScopedQueryEnabled}
                isLoading={isLoadingRuleTypes}
                selectedCategories={categoryIds || []}
                availableCategories={availableCategories}
                errors={field.errors.map((error) => error.message)}
                onChange={onCategoryIdsChange}
              />
            )}
          </UseField>
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField path="scopedQuery">
            {() => (
              <MaintenanceWindowScopedQuery
                featureIds={featureIds}
                query={query}
                filters={filters}
                isLoading={isLoadingRuleTypes}
                isEnabled={isScopedQueryEnabled}
                errors={scopedQueryErrors}
                onQueryChange={onQueryChange}
                onFiltersChange={setFilters}
              />
            )}
          </UseField>
        </EuiFlexItem>
        <EuiHorizontalRule margin="xl" />
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
      <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="l" responsive={false}>
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
});

CreateMaintenanceWindowForm.displayName = 'CreateMaintenanceWindowForm';
