/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiBadge, EuiFormRow, EuiPanel, EuiRange, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce, cloneDeep } from 'lodash';

import type { Query } from '@kbn/data-plugin/common/query';
import type { ES_FIELD_TYPES } from '@kbn/field-types';
import type { FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';
import {
  getCombinedRuntimeMappings,
  isRuntimeMappings,
  isRuntimeField,
  type RuntimeMappings as RuntimeMappingsType,
} from '@kbn/ml-runtime-field-utils';
import {
  type FieldSelectionItem,
  ANALYSIS_CONFIG_TYPE,
  TRAINING_PERCENT_MIN,
  TRAINING_PERCENT_MAX,
} from '@kbn/ml-data-frame-analytics-utils';
import { DataGrid } from '@kbn/ml-data-grid';
import { SEARCH_QUERY_LANGUAGE } from '@kbn/ml-query-utils';
import {
  OptionListWithFieldStats,
  FieldStatsFlyoutProvider,
  type FieldForStats,
} from '@kbn/ml-field-stats-flyout';

import type { DropDownLabel } from '../../../../../jobs/new_job/pages/components/pick_fields_step/components/agg_select';
import { useMlApi, useMlKibana } from '../../../../../contexts/kibana';
import { useNewJobCapsServiceAnalytics } from '../../../../../services/new_job_capabilities/new_job_capabilities_service_analytics';
import { useDataSource } from '../../../../../contexts/ml';

import { getScatterplotMatrixLegendType } from '../../../../common/get_scatterplot_matrix_legend_type';
import type { AnalyticsJobType } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { Messages } from '../shared';
import type { State } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { DEFAULT_MODEL_MEMORY_LIMIT } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { handleExplainErrorMessage, shouldAddAsDepVarOption } from './form_options_validation';

import { ANALYTICS_STEPS } from '../../page';
import { ContinueButton } from '../continue_button';
import { JobType } from './job_type';
import { SupportedFieldsMessage } from './supported_fields_message';
import { AnalysisFieldsTable } from './analysis_fields_table';
import { fetchExplainData } from '../shared';
import { useIndexData } from '../../hooks';
import { ExplorationQueryBar } from '../../../analytics_exploration/components/exploration_query_bar';
import type { SavedSearchQuery } from './use_saved_search';
import { useSavedSearch } from './use_saved_search';
import type { ExplorationQueryBarProps } from '../../../analytics_exploration/components/exploration_query_bar/exploration_query_bar';

import { ScatterplotMatrix } from '../../../../../components/scatterplot_matrix';
import { RuntimeMappings } from '../runtime_mappings';
import type { ConfigurationStepProps } from './configuration_step';
import { IndexPermissionsCallout } from '../index_permissions_callout';

const runtimeMappingKey = 'runtime_mapping';
const notIncludedReason = 'field not in includes list';
const requiredFieldsErrorText = i18n.translate(
  'xpack.ml.dataframe.analytics.createWizard.requiredFieldsErrorMessage',
  {
    defaultMessage:
      'At least one field must be included in the analysis in addition to the dependent variable.',
  }
);

function getIndexDataQuery(savedSearchQuery: SavedSearchQuery, jobConfigQuery: any) {
  // Return `undefined` if savedSearchQuery itself is `undefined`, meaning it hasn't been initialized yet.
  if (savedSearchQuery === undefined) {
    return;
  }

  return savedSearchQuery !== null ? savedSearchQuery : jobConfigQuery;
}

type RuntimeMappingFieldType =
  | ES_FIELD_TYPES.BOOLEAN
  | ES_FIELD_TYPES.DATE
  | ES_FIELD_TYPES.DOUBLE
  | ES_FIELD_TYPES.GEO_POINT
  | ES_FIELD_TYPES.IP
  | ES_FIELD_TYPES.KEYWORD
  | ES_FIELD_TYPES.LONG;

interface RuntimeOption extends EuiComboBoxOptionOption {
  field: FieldForStats;
}
function getRuntimeDepVarOptions(jobType: AnalyticsJobType, runtimeMappings: RuntimeMappingsType) {
  const runtimeOptions: RuntimeOption[] = [];
  Object.keys(runtimeMappings).forEach((id) => {
    const field = runtimeMappings[id];
    if (isRuntimeField(field) && shouldAddAsDepVarOption(id, field.type, jobType)) {
      runtimeOptions.push({
        label: id,
        field: { id, type: field.type as RuntimeMappingFieldType },
      });
    }
  });
  return runtimeOptions;
}

export const ConfigurationStepForm: FC<ConfigurationStepProps> = ({
  actions,
  isClone,
  state,
  setCurrentStep,
  sourceDataViewTitle,
}) => {
  const { services } = useMlKibana();
  const toastNotifications = services.notifications.toasts;
  const mlApi = useMlApi();
  const newJobCapsServiceAnalytics = useNewJobCapsServiceAnalytics();
  const { selectedDataView, selectedSavedSearch } = useDataSource();
  const { savedSearchQuery, savedSearchQueryStr } = useSavedSearch();

  const [fieldOptionsFetchFail, setFieldOptionsFetchFail] = useState<boolean>(false);
  const [loadingDepVarOptions, setLoadingDepVarOptions] = useState<boolean>(false);
  const [dependentVariableFetchFail, setDependentVariableFetchFail] = useState<boolean>(false);
  const [dependentVariableOptions, setDependentVariableOptions] = useState<
    EuiComboBoxOptionOption[]
  >([]);
  const [includesTableItems, setIncludesTableItems] = useState<FieldSelectionItem[]>([]);
  const [fetchingExplainData, setFetchingExplainData] = useState<boolean>(false);
  const [maxDistinctValuesError, setMaxDistinctValuesError] = useState<string | undefined>();
  const [unsupportedFieldsError, setUnsupportedFieldsError] = useState<string | undefined>();
  const [noDocsContainMappedFields, setNoDocsContainMappedFields] = useState<boolean>(false);
  const [minimumFieldsRequiredMessage, setMinimumFieldsRequiredMessage] = useState<
    undefined | string
  >();

  const { setEstimatedModelMemoryLimit, setFormState } = actions;
  const { cloneJob, estimatedModelMemoryLimit, form, isJobCreated, requestMessages } = state;
  const firstUpdate = useRef<boolean>(true);
  const {
    dependentVariable,
    includes,
    jobConfigQuery,
    jobConfigQueryLanguage,
    jobConfigQueryString,
    jobType,
    modelMemoryLimit,
    previousJobType,
    requiredFieldsError,
    runtimeMappings,
    previousRuntimeMapping,
    runtimeMappingsUpdated,
    sourceIndex,
    trainingPercent,
    useEstimatedMml,
  } = form;

  const isJobTypeWithDepVar =
    jobType === ANALYSIS_CONFIG_TYPE.REGRESSION || jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION;
  const dependentVariableEmpty = isJobTypeWithDepVar && dependentVariable === '';
  const hasBasicRequiredFields = jobType !== undefined;
  const hasRequiredAnalysisFields =
    (isJobTypeWithDepVar && dependentVariable !== '') ||
    jobType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION;

  const [query, setQuery] = useState<Query>({
    query: jobConfigQueryString ?? '',
    language: jobConfigQueryLanguage ?? SEARCH_QUERY_LANGUAGE.KUERY,
  });

  const setJobConfigQuery: ExplorationQueryBarProps['setSearchQuery'] = (update) => {
    if (update.query) {
      setFormState({
        jobConfigQuery: update.query,
        jobConfigQueryLanguage: update.language,
        jobConfigQueryString: update.queryString,
      });
    }
    setQuery({ query: update.queryString, language: update.language });
  };

  const indexData = useIndexData(
    selectedDataView,
    getIndexDataQuery(savedSearchQuery, jobConfigQuery),
    toastNotifications,
    runtimeMappings
  );

  const indexPreviewProps = {
    ...indexData,
    dataTestSubj: 'mlAnalyticsCreationDataGrid',
    toastNotifications,
  };

  const isStepInvalid =
    dependentVariableEmpty ||
    jobType === undefined ||
    maxDistinctValuesError !== undefined ||
    minimumFieldsRequiredMessage !== undefined ||
    requiredFieldsError !== undefined ||
    unsupportedFieldsError !== undefined ||
    fetchingExplainData;

  const loadDepVarOptions = async (
    formState: State['form'],
    runtimeOptions: EuiComboBoxOptionOption[] = []
  ) => {
    setLoadingDepVarOptions(true);
    setMaxDistinctValuesError(undefined);

    try {
      if (selectedDataView !== undefined) {
        const depVarOptions = [];
        let depVarUpdate = formState.dependentVariable;
        // Get fields and filter for supported types for job type
        const { fields } = newJobCapsServiceAnalytics;

        let resetDependentVariable = true;
        for (const field of fields) {
          if (shouldAddAsDepVarOption(field.id, field.type, jobType)) {
            depVarOptions.push({
              label: field.id,
              field,
            });

            if (formState.dependentVariable === field.id) {
              resetDependentVariable = false;
            }
          }
        }

        if (
          isRuntimeMappings(formState.runtimeMappings) &&
          Object.keys(formState.runtimeMappings).includes(form.dependentVariable)
        ) {
          resetDependentVariable = false;
          depVarOptions.push({
            label: form.dependentVariable,
            key: `runtime_mapping_${form.dependentVariable}`,
          });
        }

        if (resetDependentVariable) {
          depVarUpdate = '';
        }
        setDependentVariableOptions([...runtimeOptions, ...depVarOptions]);
        setLoadingDepVarOptions(false);
        setDependentVariableFetchFail(false);
        setFormState({ dependentVariable: depVarUpdate });
      }
    } catch (e) {
      setLoadingDepVarOptions(false);
      setDependentVariableFetchFail(true);
    }
  };

  const debouncedGetExplainData = debounce(async () => {
    setFetchingExplainData(true);
    const jobTypeChanged = previousJobType !== jobType;
    const shouldUpdateModelMemoryLimit =
      (!firstUpdate.current || !modelMemoryLimit) && useEstimatedMml === true;
    const shouldUpdateEstimatedMml =
      !firstUpdate.current || !modelMemoryLimit || estimatedModelMemoryLimit === '';

    if (firstUpdate.current) {
      firstUpdate.current = false;
    }

    const depVarNotIncluded =
      isJobTypeWithDepVar && includes.length > 0 && includes.includes(dependentVariable) === false;
    // Ensure runtime field is in 'includes' table if it is set as dependent variable
    const depVarIsRuntimeField =
      depVarNotIncluded &&
      runtimeMappings &&
      Object.keys(runtimeMappings).includes(dependentVariable);
    let formToUse = form;

    if (depVarIsRuntimeField || depVarNotIncluded) {
      formToUse = cloneDeep(form);
      formToUse.includes = [...includes, dependentVariable];
    }

    const {
      success,
      expectedMemory,
      fieldSelection,
      errorMessage,
      noDocsContainMappedFields: noDocsWithFields,
    } = await fetchExplainData(mlApi, formToUse);

    if (success) {
      if (shouldUpdateEstimatedMml) {
        setEstimatedModelMemoryLimit(expectedMemory);
      }

      const hasRequiredFields = fieldSelection.some(
        (field) => field.is_included === true && field.is_required === false
      );

      const formStateUpdated = {
        ...(shouldUpdateModelMemoryLimit ? { modelMemoryLimit: expectedMemory } : {}),
        ...(depVarIsRuntimeField || depVarNotIncluded ? { includes: formToUse.includes } : {}),
        requiredFieldsError: !hasRequiredFields ? requiredFieldsErrorText : undefined,
      };

      if (jobTypeChanged) {
        setFieldOptionsFetchFail(false);
        setMaxDistinctValuesError(undefined);
        setUnsupportedFieldsError(undefined);
        setNoDocsContainMappedFields(false);
        setIncludesTableItems(fieldSelection ? fieldSelection : []);
      }

      setFormState(formStateUpdated);
      setFetchingExplainData(false);
    } else {
      const {
        maxDistinctValuesErrorMessage,
        unsupportedFieldsErrorMessage,
        toastNotificationDanger,
        toastNotificationWarning,
      } = handleExplainErrorMessage(errorMessage, sourceIndex, jobType);

      if (toastNotificationDanger) {
        toastNotifications.addDanger(toastNotificationDanger);
      }
      if (toastNotificationWarning) {
        toastNotifications.addWarning(toastNotificationWarning);
      }

      const fallbackModelMemoryLimit =
        jobType !== undefined
          ? DEFAULT_MODEL_MEMORY_LIMIT[jobType]
          : DEFAULT_MODEL_MEMORY_LIMIT.outlier_detection;

      setEstimatedModelMemoryLimit(fallbackModelMemoryLimit);
      setFieldOptionsFetchFail(true);
      setMaxDistinctValuesError(maxDistinctValuesErrorMessage);
      setUnsupportedFieldsError(unsupportedFieldsErrorMessage);
      setNoDocsContainMappedFields(noDocsWithFields);
      setFetchingExplainData(false);
      setFormState({
        ...(shouldUpdateModelMemoryLimit ? { modelMemoryLimit: fallbackModelMemoryLimit } : {}),
      });
    }
  }, 300);

  useEffect(() => {
    setFormState({ sourceIndex: selectedDataView.title });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dataViewFieldsTableItems = useMemo(() => {
    if (indexData?.dataViewFields !== undefined) {
      return indexData.dataViewFields.map((field) => ({
        name: field,
        is_included: false,
        is_required: false,
      }));
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [`${indexData?.dataViewFields}`]);

  useEffect(() => {
    if (typeof savedSearchQueryStr === 'string') {
      setFormState({ jobConfigQuery: savedSearchQuery, jobConfigQueryString: savedSearchQueryStr });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(savedSearchQuery), savedSearchQueryStr]);

  useEffect(() => {
    if (isJobTypeWithDepVar) {
      const dataViewRuntimeFields = getCombinedRuntimeMappings(selectedDataView);
      let runtimeOptions;

      if (dataViewRuntimeFields) {
        runtimeOptions = getRuntimeDepVarOptions(jobType, dataViewRuntimeFields);
      }

      loadDepVarOptions(form, runtimeOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobType]);

  const handleRuntimeUpdate = useCallback(async () => {
    if (runtimeMappingsUpdated) {
      // Update dependent variable options
      let resetDepVar = false;
      if (isJobTypeWithDepVar) {
        const filteredOptions = dependentVariableOptions.filter((option) => {
          if (option.label === dependentVariable && option.key?.includes(runtimeMappingKey)) {
            resetDepVar = true;
          }
          return !option.key?.includes(runtimeMappingKey);
        });
        // Runtime fields have been removed
        if (runtimeMappings === undefined && runtimeMappingsUpdated === true) {
          setDependentVariableOptions(filteredOptions);
        } else if (runtimeMappings) {
          // add to filteredOptions if it's the type supported
          const runtimeOptions = getRuntimeDepVarOptions(jobType, runtimeMappings);
          setDependentVariableOptions([...filteredOptions, ...runtimeOptions]);
        }
      }

      // Update includes - remove previous runtime fields then add supported runtime fields to includes
      const updatedIncludes = includes.filter((field) => {
        const isRemovedRuntimeField = previousRuntimeMapping && previousRuntimeMapping[field];
        return !isRemovedRuntimeField;
      });

      if (resetDepVar) {
        setFormState({
          dependentVariable: '',
          includes: updatedIncludes,
        });
        setIncludesTableItems(
          includesTableItems.filter(({ name }) => {
            const isRemovedRuntimeField = previousRuntimeMapping && previousRuntimeMapping[name];
            return !isRemovedRuntimeField;
          })
        );
      }

      if (!resetDepVar && hasBasicRequiredFields && hasRequiredAnalysisFields) {
        const formCopy = cloneDeep(form);
        // When switching back to step ensure runtime field is in 'includes' table if it is set as dependent variable
        const depVarIsRuntimeField =
          isJobTypeWithDepVar &&
          runtimeMappings &&
          Object.keys(runtimeMappings).includes(dependentVariable) &&
          formCopy.includes.length > 0 &&
          formCopy.includes.includes(dependentVariable) === false;

        formCopy.includes = depVarIsRuntimeField
          ? [...updatedIncludes, dependentVariable]
          : updatedIncludes;

        const {
          success,
          fieldSelection,
          errorMessage,
          noDocsContainMappedFields: noDocsWithFields,
        } = await fetchExplainData(mlApi, formCopy);
        if (success) {
          // update the field selection table
          const hasRequiredFields = fieldSelection.some(
            (field) => field.is_included === true && field.is_required === false
          );
          let updatedFieldSelection;
          // Update field selection to select supported runtime fields by default. Add those fields to 'includes'.
          if (isRuntimeMappings(runtimeMappings)) {
            updatedFieldSelection = fieldSelection.map((field) => {
              if (
                runtimeMappings[field.name] !== undefined &&
                field.is_included === false &&
                field.reason?.includes(notIncludedReason)
              ) {
                updatedIncludes.push(field.name);
                field.is_included = true;
              }
              return field;
            });
          }
          setIncludesTableItems(updatedFieldSelection ? updatedFieldSelection : fieldSelection);
          setMaxDistinctValuesError(undefined);
          setUnsupportedFieldsError(undefined);
          setNoDocsContainMappedFields(noDocsWithFields);
          setFormState({
            includes: updatedIncludes,
            requiredFieldsError: !hasRequiredFields ? requiredFieldsErrorText : undefined,
          });
        } else {
          const {
            maxDistinctValuesErrorMessage,
            unsupportedFieldsErrorMessage,
            toastNotificationDanger,
            toastNotificationWarning,
          } = handleExplainErrorMessage(errorMessage, sourceIndex, jobType);

          if (toastNotificationDanger) {
            toastNotifications.addDanger(toastNotificationDanger);
          }
          if (toastNotificationWarning) {
            toastNotifications.addWarning(toastNotificationWarning);
          }

          setMaxDistinctValuesError(maxDistinctValuesErrorMessage);
          setUnsupportedFieldsError(unsupportedFieldsErrorMessage);
          setNoDocsContainMappedFields(noDocsWithFields);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(runtimeMappings)]);

  useEffect(() => {
    handleRuntimeUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(runtimeMappings)]);

  useEffect(() => {
    if (hasBasicRequiredFields && hasRequiredAnalysisFields) {
      debouncedGetExplainData();
    }

    return () => {
      debouncedGetExplainData.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobType, dependentVariable, trainingPercent, JSON.stringify(includes), jobConfigQueryString]);

  const scatterplotMatrixProps = useMemo(
    () => ({
      color: isJobTypeWithDepVar ? dependentVariable : undefined,
      fields: includesTableItems
        .filter((d) => d.feature_type === 'numerical' && d.is_included)
        .map((d) => d.name),
      index: selectedDataView.title,
      legendType: getScatterplotMatrixLegendType(jobType),
      searchQuery: jobConfigQuery,
      runtimeMappings,
      dataView: selectedDataView,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      selectedDataView.title,
      dependentVariable,
      includesTableItems,
      isJobTypeWithDepVar,
      jobConfigQuery,
      jobType,
    ]
  );

  // Show the Scatterplot Matrix only if
  // - There's more than one suitable field available
  // - The job type is outlier detection, or
  // - The job type is regression or classification and the dependent variable has been set
  const showScatterplotMatrix = useMemo(
    () =>
      (jobType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION ||
        (isJobTypeWithDepVar && !dependentVariableEmpty)) &&
      scatterplotMatrixProps.fields.length > 1,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dependentVariableEmpty, jobType, scatterplotMatrixProps.fields.length]
  );
  const fieldStatsServices: FieldStatsServices = useMemo(() => {
    const { uiSettings, data, fieldFormats, charts } = services;
    return {
      uiSettings,
      dataViews: data.dataViews,
      data,
      fieldFormats,
      charts,
    };
  }, [services]);

  // Don't render until `savedSearchQuery` has been initialized.
  // `undefined` means uninitialized, `null` means initialized but not used.
  if (savedSearchQuery === undefined) return null;

  const tableItems =
    includesTableItems.length > 0 && !noDocsContainMappedFields
      ? includesTableItems
      : dataViewFieldsTableItems;

  return (
    <FieldStatsFlyoutProvider
      dataView={selectedDataView}
      fieldStatsServices={fieldStatsServices}
      timeRangeMs={indexData.timeRangeMs}
      dslQuery={jobConfigQuery}
      theme={services.theme}
    >
      <Fragment>
        <Messages messages={requestMessages} />
        <SupportedFieldsMessage jobType={jobType} />
        <IndexPermissionsCallout indexName={sourceDataViewTitle} docsType="create" />
        <JobType type={jobType} setFormState={setFormState} />
        {savedSearchQuery === null && (
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.analytics.create.sourceQueryLabel', {
              defaultMessage: 'Query',
            })}
            fullWidth
          >
            <ExplorationQueryBar
              dataView={selectedDataView}
              setSearchQuery={setJobConfigQuery}
              query={query}
            />
          </EuiFormRow>
        )}
        {((isClone && cloneJob) || !isClone) && <RuntimeMappings actions={actions} state={state} />}
        <EuiFormRow
          label={
            <Fragment>
              {savedSearchQuery !== null && (
                <EuiText>
                  {i18n.translate('xpack.ml.dataframe.analytics.create.savedSearchLabel', {
                    defaultMessage: 'Saved search',
                  })}
                </EuiText>
              )}
              <EuiBadge color="hollow">
                {selectedSavedSearch !== null
                  ? selectedSavedSearch.title
                  : selectedDataView.getName()}
              </EuiBadge>
            </Fragment>
          }
          fullWidth
        >
          <DataGrid {...indexPreviewProps} />
        </EuiFormRow>
        {isJobTypeWithDepVar && (
          <Fragment>
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.ml.dataframe.analytics.create.dependentVariableLabel', {
                defaultMessage: 'Dependent variable',
              })}
              helpText={
                dependentVariableOptions.length === 0 &&
                dependentVariableFetchFail === false &&
                selectedDataView &&
                i18n.translate(
                  'xpack.ml.dataframe.analytics.create.dependentVariableOptionsNoNumericalFields',
                  {
                    defaultMessage: 'No numeric type fields were found for this data view.',
                  }
                )
              }
              isInvalid={maxDistinctValuesError !== undefined}
              error={[
                ...(dependentVariableFetchFail === true
                  ? [
                      <Fragment>
                        {i18n.translate(
                          'xpack.ml.dataframe.analytics.create.dependentVariableOptionsFetchError',
                          {
                            defaultMessage:
                              'There was a problem fetching fields. Please refresh the page and try again.',
                          }
                        )}
                      </Fragment>,
                    ]
                  : []),
                ...(fieldOptionsFetchFail === true && maxDistinctValuesError !== undefined
                  ? [
                      <Fragment>
                        {i18n.translate(
                          'xpack.ml.dataframe.analytics.create.dependentVariableMaxDistictValuesError',
                          {
                            defaultMessage: 'Invalid. {message}',
                            values: { message: maxDistinctValuesError },
                          }
                        )}
                      </Fragment>,
                    ]
                  : []),
              ]}
            >
              <OptionListWithFieldStats
                fullWidth
                aria-label={i18n.translate(
                  'xpack.ml.dataframe.analytics.create.dependentVariableInputAriaLabel',
                  {
                    defaultMessage: 'Enter field to be used as dependent variable.',
                  }
                )}
                placeholder={
                  jobType === ANALYSIS_CONFIG_TYPE.REGRESSION
                    ? i18n.translate(
                        'xpack.ml.dataframe.analytics.create.dependentVariableRegressionPlaceholder',
                        {
                          defaultMessage: 'Select the numeric field that you want to predict.',
                        }
                      )
                    : i18n.translate(
                        'xpack.ml.dataframe.analytics.create.dependentVariableClassificationPlaceholder',
                        {
                          defaultMessage:
                            'Select the numeric, categorical, or boolean field that you want to predict.',
                        }
                      )
                }
                isDisabled={isJobCreated}
                isLoading={loadingDepVarOptions}
                singleSelection={true}
                options={dependentVariableOptions}
                selectedOptions={dependentVariable ? [{ label: dependentVariable }] : []}
                onChange={(selectedOptions: DropDownLabel[]) => {
                  setFormState({
                    dependentVariable: selectedOptions[0].label || '',
                  });
                }}
                isClearable={false}
                isInvalid={dependentVariable === ''}
                data-test-subj={`mlAnalyticsCreateJobWizardDependentVariableSelect${
                  loadingDepVarOptions ? ' loading' : ' loaded'
                }`}
              />
            </EuiFormRow>
          </Fragment>
        )}
        <AnalysisFieldsTable
          dependentVariable={dependentVariable}
          includes={includes}
          isJobTypeWithDepVar={isJobTypeWithDepVar}
          minimumFieldsRequiredMessage={minimumFieldsRequiredMessage}
          setMinimumFieldsRequiredMessage={setMinimumFieldsRequiredMessage}
          tableItems={firstUpdate.current ? includesTableItems : tableItems}
          unsupportedFieldsError={unsupportedFieldsError}
          setUnsupportedFieldsError={setUnsupportedFieldsError}
          setFormState={setFormState}
        />
        <EuiFormRow
          fullWidth
          isInvalid={requiredFieldsError !== undefined}
          error={i18n.translate('xpack.ml.dataframe.analytics.create.requiredFieldsError', {
            defaultMessage: 'Invalid. {message}',
            values: { message: requiredFieldsError },
          })}
        >
          <Fragment />
        </EuiFormRow>
        <EuiSpacer />
        {showScatterplotMatrix && (
          <>
            <EuiFormRow
              data-test-subj="mlAnalyticsCreateJobWizardScatterplotMatrixFormRow"
              label={i18n.translate('xpack.ml.dataframe.analytics.create.scatterplotMatrixLabel', {
                defaultMessage: 'Scatterplot matrix',
              })}
              helpText={i18n.translate(
                'xpack.ml.dataframe.analytics.create.scatterplotMatrixLabelHelpText',
                {
                  defaultMessage:
                    'Visualizes the relationships between pairs of selected included fields.',
                }
              )}
              fullWidth
            >
              <Fragment />
            </EuiFormRow>
            <EuiPanel
              paddingSize="m"
              data-test-subj="mlAnalyticsCreateJobWizardScatterplotMatrixPanel"
            >
              <ScatterplotMatrix {...scatterplotMatrixProps} />
            </EuiPanel>
            <EuiSpacer />
          </>
        )}
        {isJobTypeWithDepVar && (
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.ml.dataframe.analytics.create.trainingPercentLabel', {
              defaultMessage: 'Training percent',
            })}
            helpText={i18n.translate(
              'xpack.ml.dataframe.analytics.create.trainingPercentHelpText',
              {
                defaultMessage:
                  'Defines the percentage of eligible documents that will be used for training.',
              }
            )}
          >
            <EuiRange
              fullWidth
              min={TRAINING_PERCENT_MIN}
              max={TRAINING_PERCENT_MAX}
              step={1}
              showLabels
              showRange
              showValue
              value={trainingPercent}
              // @ts-ignore Property 'value' does not exist on type 'EventTarget' | (EventTarget & HTMLInputElement)
              onChange={(e) => setFormState({ trainingPercent: +e.target.value })}
              data-test-subj="mlAnalyticsCreateJobWizardTrainingPercentSlider"
            />
          </EuiFormRow>
        )}
        <EuiSpacer />
        <ContinueButton
          isDisabled={isStepInvalid}
          onClick={() => {
            setCurrentStep(ANALYTICS_STEPS.ADVANCED);
          }}
        />
      </Fragment>
    </FieldStatsFlyoutProvider>
  );
};
