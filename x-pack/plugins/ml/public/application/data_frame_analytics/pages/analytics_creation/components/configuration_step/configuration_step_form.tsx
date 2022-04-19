/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiPanel,
  EuiRange,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce, cloneDeep } from 'lodash';

import { Query } from '@kbn/data-plugin/common/query';
import { newJobCapsServiceAnalytics } from '../../../../../services/new_job_capabilities/new_job_capabilities_service_analytics';
import { useMlContext } from '../../../../../contexts/ml';
import { getCombinedRuntimeMappings } from '../../../../../components/data_grid/common';

import {
  ANALYSIS_CONFIG_TYPE,
  TRAINING_PERCENT_MIN,
  TRAINING_PERCENT_MAX,
  FieldSelectionItem,
} from '../../../../common/analytics';
import { getScatterplotMatrixLegendType } from '../../../../common/get_scatterplot_matrix_legend_type';
import { RuntimeMappings as RuntimeMappingsType } from '../../../../../../../common/types/fields';
import {
  isRuntimeMappings,
  isRuntimeField,
} from '../../../../../../../common/util/runtime_field_utils';
import { AnalyticsJobType } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { Messages } from '../shared';
import {
  DEFAULT_MODEL_MEMORY_LIMIT,
  State,
} from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { handleExplainErrorMessage, shouldAddAsDepVarOption } from './form_options_validation';
import { getToastNotifications } from '../../../../../util/dependency_cache';

import { ANALYTICS_STEPS } from '../../page';
import { ContinueButton } from '../continue_button';
import { JobType } from './job_type';
import { SupportedFieldsMessage } from './supported_fields_message';
import { AnalysisFieldsTable } from './analysis_fields_table';
import { DataGrid } from '../../../../../components/data_grid';
import { fetchExplainData } from '../shared';
import { useIndexData } from '../../hooks';
import { ExplorationQueryBar } from '../../../analytics_exploration/components/exploration_query_bar';
import { useSavedSearch, SavedSearchQuery } from './use_saved_search';
import { SEARCH_QUERY_LANGUAGE } from '../../../../../../../common/constants/search';
import { ExplorationQueryBarProps } from '../../../analytics_exploration/components/exploration_query_bar/exploration_query_bar';

import { ScatterplotMatrix } from '../../../../../components/scatterplot_matrix';
import { RuntimeMappings } from '../runtime_mappings';
import { ConfigurationStepProps } from './configuration_step';

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

function getRuntimeDepVarOptions(jobType: AnalyticsJobType, runtimeMappings: RuntimeMappingsType) {
  const runtimeOptions: EuiComboBoxOptionOption[] = [];
  Object.keys(runtimeMappings).forEach((id) => {
    const field = runtimeMappings[id];
    if (isRuntimeField(field) && shouldAddAsDepVarOption(id, field.type, jobType)) {
      runtimeOptions.push({
        label: id,
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
}) => {
  const mlContext = useMlContext();
  const { currentSavedSearch, currentDataView } = mlContext;
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

  const toastNotifications = getToastNotifications();

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
    currentDataView,
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
      if (currentDataView !== undefined) {
        const depVarOptions = [];
        let depVarUpdate = formState.dependentVariable;
        // Get fields and filter for supported types for job type
        const { fields } = newJobCapsServiceAnalytics;

        let resetDependentVariable = true;
        for (const field of fields) {
          if (shouldAddAsDepVarOption(field.id, field.type, jobType)) {
            depVarOptions.push({
              label: field.id,
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
    } = await fetchExplainData(formToUse);

    if (success) {
      if (shouldUpdateEstimatedMml) {
        setEstimatedModelMemoryLimit(expectedMemory);
      }

      const hasRequiredFields = fieldSelection.some(
        (field) => field.is_included === true && field.is_required === false
      );

      const formStateUpdated = {
        ...(shouldUpdateModelMemoryLimit ? { modelMemoryLimit: expectedMemory } : {}),
        ...(depVarIsRuntimeField || jobTypeChanged || depVarNotIncluded
          ? { includes: formToUse.includes }
          : {}),
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
    setFormState({ sourceIndex: currentDataView.title });
  }, []);

  const indexPatternFieldsTableItems = useMemo(() => {
    if (indexData?.indexPatternFields !== undefined) {
      return indexData.indexPatternFields.map((field) => ({
        name: field,
        is_included: false,
        is_required: false,
      }));
    }
    return [];
  }, [`${indexData?.indexPatternFields}`]);

  useEffect(() => {
    if (typeof savedSearchQueryStr === 'string') {
      setFormState({ jobConfigQuery: savedSearchQuery, jobConfigQueryString: savedSearchQueryStr });
    }
  }, [JSON.stringify(savedSearchQuery), savedSearchQueryStr]);

  useEffect(() => {
    if (isJobTypeWithDepVar) {
      const indexPatternRuntimeFields = getCombinedRuntimeMappings(currentDataView);
      let runtimeOptions;

      if (indexPatternRuntimeFields) {
        runtimeOptions = getRuntimeDepVarOptions(jobType, indexPatternRuntimeFields);
      }

      loadDepVarOptions(form, runtimeOptions);
    }
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
        } = await fetchExplainData(formCopy);
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
  }, [JSON.stringify(runtimeMappings)]);

  useEffect(() => {
    handleRuntimeUpdate();
  }, [JSON.stringify(runtimeMappings)]);

  useEffect(() => {
    if (hasBasicRequiredFields && hasRequiredAnalysisFields) {
      debouncedGetExplainData();
    }

    return () => {
      debouncedGetExplainData.cancel();
    };
  }, [jobType, dependentVariable, trainingPercent, JSON.stringify(includes), jobConfigQueryString]);

  const scatterplotMatrixProps = useMemo(
    () => ({
      color: isJobTypeWithDepVar ? dependentVariable : undefined,
      fields: includesTableItems
        .filter((d) => d.feature_type === 'numerical' && d.is_included)
        .map((d) => d.name),
      index: currentDataView.title,
      legendType: getScatterplotMatrixLegendType(jobType),
      searchQuery: jobConfigQuery,
      runtimeMappings,
      indexPattern: currentDataView,
    }),
    [
      currentDataView.title,
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
    [dependentVariableEmpty, jobType, scatterplotMatrixProps.fields.length]
  );

  // Don't render until `savedSearchQuery` has been initialized.
  // `undefined` means uninitialized, `null` means initialized but not used.
  if (savedSearchQuery === undefined) return null;

  const tableItems =
    includesTableItems.length > 0 && !noDocsContainMappedFields
      ? includesTableItems
      : indexPatternFieldsTableItems;

  return (
    <Fragment>
      <Messages messages={requestMessages} />
      <SupportedFieldsMessage jobType={jobType} />
      <JobType type={jobType} setFormState={setFormState} />
      {savedSearchQuery === null && (
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.sourceQueryLabel', {
            defaultMessage: 'Query',
          })}
          fullWidth
        >
          <ExplorationQueryBar
            indexPattern={currentDataView}
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
              {savedSearchQuery !== null
                ? currentSavedSearch?.attributes.title
                : currentDataView.title}
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
              currentDataView &&
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
            <EuiComboBox
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
              onChange={(selectedOptions) => {
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
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.trainingPercentHelpText', {
            defaultMessage:
              'Defines the percentage of eligible documents that will be used for training.',
          })}
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
  );
};
