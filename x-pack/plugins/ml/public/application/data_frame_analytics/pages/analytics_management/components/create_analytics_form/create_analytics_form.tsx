/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useEffect, useMemo, useRef } from 'react';

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiForm,
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiRange,
  EuiSwitch,
} from '@elastic/eui';
import { debounce } from 'lodash';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { useMlKibana } from '../../../../../contexts/kibana';
import { ml } from '../../../../../services/ml_api_service';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { useMlContext } from '../../../../../contexts/ml';
import { CreateAnalyticsFormProps } from '../../hooks/use_create_analytics_form';
import {
  DEFAULT_MODEL_MEMORY_LIMIT,
  getJobConfigFromFormState,
  State,
} from '../../hooks/use_create_analytics_form/state';
import { JOB_ID_MAX_LENGTH } from '../../../../../../../common/constants/validation';
import { Messages } from './messages';
import { JobType } from './job_type';
import { JobDescriptionInput } from './job_description';
import { getModelMemoryLimitErrors } from '../../hooks/use_create_analytics_form/reducer';
import { IndexPattern, indexPatterns } from '../../../../../../../../../../src/plugins/data/public';
import {
  ANALYSIS_CONFIG_TYPE,
  DfAnalyticsExplainResponse,
  FieldSelectionItem,
  NUM_TOP_FEATURE_IMPORTANCE_VALUES_MIN,
  TRAINING_PERCENT_MIN,
  TRAINING_PERCENT_MAX,
} from '../../../../common/analytics';
import { shouldAddAsDepVarOption, OMIT_FIELDS } from './form_options_validation';

const requiredFieldsErrorText = i18n.translate(
  'xpack.ml.dataframe.analytics.create.requiredFieldsErrorMessage',
  {
    defaultMessage: 'At least one field must be included in the analysis.',
  }
);

export const CreateAnalyticsForm: FC<CreateAnalyticsFormProps> = ({ actions, state }) => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
  const { setFormState, setEstimatedModelMemoryLimit } = actions;
  const mlContext = useMlContext();
  const {
    estimatedModelMemoryLimit,
    form,
    indexPatternsMap,
    isAdvancedEditorEnabled,
    isJobCreated,
    requestMessages,
  } = state;

  const forceInput = useRef<HTMLInputElement | null>(null);
  const firstUpdate = useRef<boolean>(true);

  const {
    createIndexPattern,
    dependentVariable,
    dependentVariableFetchFail,
    dependentVariableOptions,
    description,
    destinationIndex,
    destinationIndexNameEmpty,
    destinationIndexNameExists,
    destinationIndexNameValid,
    destinationIndexPatternTitleExists,
    excludes,
    excludesOptions,
    fieldOptionsFetchFail,
    jobId,
    jobIdEmpty,
    jobIdExists,
    jobIdValid,
    jobIdInvalidMaxLength,
    jobType,
    loadingDepVarOptions,
    loadingFieldOptions,
    maxDistinctValuesError,
    modelMemoryLimit,
    modelMemoryLimitValidationResult,
    numTopFeatureImportanceValues,
    numTopFeatureImportanceValuesValid,
    previousJobType,
    previousSourceIndex,
    requiredFieldsError,
    sourceIndex,
    sourceIndexNameEmpty,
    sourceIndexNameValid,
    sourceIndexContainsNumericalFields,
    sourceIndexFieldsCheckFailed,
    trainingPercent,
  } = form;
  const characterList = indexPatterns.ILLEGAL_CHARACTERS_VISIBLE.join(', ');

  const mmlErrors = useMemo(() => getModelMemoryLimitErrors(modelMemoryLimitValidationResult), [
    modelMemoryLimitValidationResult,
  ]);

  const isJobTypeWithDepVar =
    jobType === ANALYSIS_CONFIG_TYPE.REGRESSION || jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION;

  // Find out if index pattern contain numeric fields. Provides a hint in the form
  // that an analytics jobs is not able to identify outliers if there are no numeric fields present.
  const validateSourceIndexFields = async () => {
    try {
      const indexPattern: IndexPattern = await mlContext.indexPatterns.get(
        indexPatternsMap[sourceIndex].value
      );
      const containsNumericalFields: boolean = indexPattern.fields.some(
        ({ name, type }) => !OMIT_FIELDS.includes(name) && type === 'number'
      );

      setFormState({
        sourceIndexContainsNumericalFields: containsNumericalFields,
        sourceIndexFieldsCheckFailed: false,
      });
    } catch (e) {
      setFormState({
        sourceIndexFieldsCheckFailed: true,
      });
    }
  };

  const onCreateOption = (searchValue: string, flattenedOptions: EuiComboBoxOptionOption[]) => {
    const normalizedSearchValue = searchValue.trim().toLowerCase();

    if (!normalizedSearchValue) {
      return;
    }

    const newOption = {
      label: searchValue,
    };

    // Create the option if it doesn't exist.
    if (
      !flattenedOptions.some(
        (option: EuiComboBoxOptionOption) =>
          option.label.trim().toLowerCase() === normalizedSearchValue
      )
    ) {
      excludesOptions.push(newOption);
      setFormState({ excludes: [...excludes, newOption.label] });
    }
  };

  const debouncedGetExplainData = debounce(async () => {
    const jobTypeOrIndexChanged =
      previousSourceIndex !== sourceIndex || previousJobType !== jobType;
    const shouldUpdateModelMemoryLimit = !firstUpdate.current || !modelMemoryLimit;
    const shouldUpdateEstimatedMml =
      !firstUpdate.current || !modelMemoryLimit || estimatedModelMemoryLimit === '';

    if (firstUpdate.current) {
      firstUpdate.current = false;
    }
    // Reset if sourceIndex or jobType changes (jobType requires dependent_variable to be set -
    // which won't be the case if switching from outlier detection)
    if (jobTypeOrIndexChanged) {
      setFormState({
        loadingFieldOptions: true,
      });
    }

    try {
      const jobConfig = getJobConfigFromFormState(form);
      delete jobConfig.dest;
      delete jobConfig.model_memory_limit;
      const resp: DfAnalyticsExplainResponse = await ml.dataFrameAnalytics.explainDataFrameAnalytics(
        jobConfig
      );
      const expectedMemoryWithoutDisk = resp.memory_estimation?.expected_memory_without_disk;

      if (shouldUpdateEstimatedMml) {
        setEstimatedModelMemoryLimit(expectedMemoryWithoutDisk);
      }

      const fieldSelection: FieldSelectionItem[] | undefined = resp.field_selection;

      let hasRequiredFields = false;
      if (fieldSelection) {
        for (let i = 0; i < fieldSelection.length; i++) {
          const field = fieldSelection[i];
          if (field.is_included === true && field.is_required === false) {
            hasRequiredFields = true;
            break;
          }
        }
      }

      // If sourceIndex has changed load analysis field options again
      if (jobTypeOrIndexChanged) {
        const analyzedFieldsOptions: EuiComboBoxOptionOption[] = [];

        if (resp.field_selection) {
          resp.field_selection.forEach((selectedField: FieldSelectionItem) => {
            if (selectedField.is_included === true && selectedField.name !== dependentVariable) {
              analyzedFieldsOptions.push({ label: selectedField.name });
            }
          });
        }

        setFormState({
          ...(shouldUpdateModelMemoryLimit ? { modelMemoryLimit: expectedMemoryWithoutDisk } : {}),
          excludesOptions: analyzedFieldsOptions,
          loadingFieldOptions: false,
          fieldOptionsFetchFail: false,
          maxDistinctValuesError: undefined,
          requiredFieldsError: !hasRequiredFields ? requiredFieldsErrorText : undefined,
        });
      } else {
        setFormState({
          ...(shouldUpdateModelMemoryLimit ? { modelMemoryLimit: expectedMemoryWithoutDisk } : {}),
          requiredFieldsError: !hasRequiredFields ? requiredFieldsErrorText : undefined,
        });
      }
    } catch (e) {
      let errorMessage;
      if (
        jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION &&
        e.body &&
        e.body.message !== undefined &&
        e.body.message.includes('status_exception') &&
        e.body.message.includes('must have at most')
      ) {
        errorMessage = e.body.message;
      }
      const fallbackModelMemoryLimit =
        jobType !== undefined
          ? DEFAULT_MODEL_MEMORY_LIMIT[jobType]
          : DEFAULT_MODEL_MEMORY_LIMIT.outlier_detection;
      setEstimatedModelMemoryLimit(fallbackModelMemoryLimit);
      setFormState({
        fieldOptionsFetchFail: true,
        maxDistinctValuesError: errorMessage,
        loadingFieldOptions: false,
        ...(shouldUpdateModelMemoryLimit ? { modelMemoryLimit: fallbackModelMemoryLimit } : {}),
      });
    }
  }, 400);

  const loadDepVarOptions = async (formState: State['form']) => {
    setFormState({
      loadingDepVarOptions: true,
      // clear when the source index changes
      maxDistinctValuesError: undefined,
      sourceIndexFieldsCheckFailed: false,
      sourceIndexContainsNumericalFields: true,
    });
    try {
      const indexPattern: IndexPattern = await mlContext.indexPatterns.get(
        indexPatternsMap[sourceIndex].value
      );

      if (indexPattern !== undefined) {
        const formStateUpdate: {
          loadingDepVarOptions: boolean;
          dependentVariableFetchFail: boolean;
          dependentVariableOptions: State['form']['dependentVariableOptions'];
          dependentVariable?: State['form']['dependentVariable'];
        } = {
          loadingDepVarOptions: false,
          dependentVariableFetchFail: false,
          dependentVariableOptions: [] as State['form']['dependentVariableOptions'],
        };

        await newJobCapsService.initializeFromIndexPattern(indexPattern, false, false);
        // Get fields and filter for supported types for job type
        const { fields } = newJobCapsService;

        let resetDependentVariable = true;
        for (const field of fields) {
          if (shouldAddAsDepVarOption(field, jobType)) {
            formStateUpdate.dependentVariableOptions.push({
              label: field.id,
            });

            if (formState.dependentVariable === field.id) {
              resetDependentVariable = false;
            }
          }
        }

        if (resetDependentVariable) {
          formStateUpdate.dependentVariable = '';
        }

        setFormState(formStateUpdate);
      }
    } catch (e) {
      setFormState({ loadingDepVarOptions: false, dependentVariableFetchFail: true });
    }
  };

  const getSourceIndexErrorMessages = () => {
    const errors = [];
    if (!sourceIndexNameEmpty && !sourceIndexNameValid) {
      errors.push(
        <Fragment>
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.create.sourceIndexInvalidError"
            defaultMessage="Invalid source index name, it cannot contain spaces or the characters: {characterList}"
            values={{ characterList }}
          />
        </Fragment>
      );
    }

    if (sourceIndexFieldsCheckFailed === true) {
      errors.push(
        <Fragment>
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.create.sourceIndexFieldCheckError"
            defaultMessage="There was a problem checking for numerical fields. Please refresh the page and try again."
          />
        </Fragment>
      );
    }

    return errors;
  };

  const onSourceIndexChange = (selectedOptions: EuiComboBoxOptionOption[]) => {
    setFormState({
      excludes: [],
      excludesOptions: [],
      previousSourceIndex: sourceIndex,
      sourceIndex: selectedOptions[0].label || '',
      requiredFieldsError: undefined,
    });
  };

  useEffect(() => {
    if (isJobTypeWithDepVar && sourceIndexNameEmpty === false) {
      loadDepVarOptions(form);
    }

    if (jobType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION && sourceIndexNameEmpty === false) {
      validateSourceIndexFields();
    }
  }, [sourceIndex, jobType, sourceIndexNameEmpty]);

  useEffect(() => {
    const hasBasicRequiredFields =
      jobType !== undefined && sourceIndex !== '' && sourceIndexNameValid === true;

    const hasRequiredAnalysisFields =
      (isJobTypeWithDepVar && dependentVariable !== '') ||
      jobType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION;

    if (hasBasicRequiredFields && hasRequiredAnalysisFields) {
      debouncedGetExplainData();
    }

    return () => {
      debouncedGetExplainData.cancel();
    };
  }, [
    jobType,
    sourceIndex,
    sourceIndexNameEmpty,
    dependentVariable,
    trainingPercent,
    JSON.stringify(excludes),
  ]);

  // Temp effect to close the context menu popover on Clone button click
  useEffect(() => {
    if (forceInput.current === null) {
      return;
    }
    const evt = document.createEvent('MouseEvents');
    evt.initEvent('mouseup', true, true);
    forceInput.current.dispatchEvent(evt);
  }, []);

  const noSupportetdAnalysisFields =
    excludesOptions.length === 0 && fieldOptionsFetchFail === false && !sourceIndexNameEmpty;

  return (
    <EuiForm className="mlDataFrameAnalyticsCreateForm">
      <Messages messages={requestMessages} />
      {!isJobCreated && (
        <Fragment>
          <JobType type={jobType} setFormState={setFormState} />
          <EuiFormRow
            helpText={i18n.translate(
              'xpack.ml.dataframe.analytics.create.enableAdvancedEditorHelpText',
              {
                defaultMessage: 'You cannot switch back to this form from the advanced editor.',
              }
            )}
          >
            <EuiSwitch
              disabled={jobType === undefined}
              compressed={true}
              name="mlDataFrameAnalyticsEnableAdvancedEditor"
              label={i18n.translate(
                'xpack.ml.dataframe.analytics.create.enableAdvancedEditorSwitch',
                {
                  defaultMessage: 'Enable advanced editor',
                }
              )}
              checked={isAdvancedEditorEnabled}
              onChange={actions.switchToAdvancedEditor}
              data-test-subj="mlAnalyticsCreateJobFlyoutAdvancedEditorSwitch"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.analytics.create.jobIdLabel', {
              defaultMessage: 'Job ID',
            })}
            isInvalid={(!jobIdEmpty && !jobIdValid) || jobIdExists || jobIdInvalidMaxLength}
            error={[
              ...(!jobIdEmpty && !jobIdValid
                ? [
                    i18n.translate('xpack.ml.dataframe.analytics.create.jobIdInvalidError', {
                      defaultMessage:
                        'Must contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores only and must start and end with alphanumeric characters.',
                    }),
                  ]
                : []),
              ...(jobIdExists
                ? [
                    i18n.translate('xpack.ml.dataframe.analytics.create.jobIdExistsError', {
                      defaultMessage: 'An analytics job with this ID already exists.',
                    }),
                  ]
                : []),
              ...(jobIdInvalidMaxLength
                ? [
                    i18n.translate(
                      'xpack.ml.dataframe.analytics.create.jobIdInvalidMaxLengthErrorMessage',
                      {
                        defaultMessage:
                          'Job ID must be no more than {maxLength, plural, one {# character} other {# characters}} long.',
                        values: {
                          maxLength: JOB_ID_MAX_LENGTH,
                        },
                      }
                    ),
                  ]
                : []),
            ]}
          >
            <EuiFieldText
              inputRef={(input) => {
                if (input) {
                  forceInput.current = input;
                }
              }}
              disabled={isJobCreated}
              placeholder={i18n.translate('xpack.ml.dataframe.analytics.create.jobIdPlaceholder', {
                defaultMessage: 'Job ID',
              })}
              value={jobId}
              onChange={(e) => setFormState({ jobId: e.target.value })}
              aria-label={i18n.translate(
                'xpack.ml.dataframe.analytics.create.jobIdInputAriaLabel',
                {
                  defaultMessage: 'Choose a unique analytics job ID.',
                }
              )}
              isInvalid={(!jobIdEmpty && !jobIdValid) || jobIdExists}
              data-test-subj="mlAnalyticsCreateJobFlyoutJobIdInput"
            />
          </EuiFormRow>
          <JobDescriptionInput description={description} setFormState={setFormState} />
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.analytics.create.sourceIndexLabel', {
              defaultMessage: 'Source index',
            })}
            helpText={
              !sourceIndexNameEmpty &&
              !sourceIndexContainsNumericalFields &&
              i18n.translate('xpack.ml.dataframe.analytics.create.sourceIndexHelpText', {
                defaultMessage:
                  'This index pattern does not contain any numeric type fields. The analytics job may not be able to come up with any outliers.',
              })
            }
            isInvalid={!sourceIndexNameEmpty && !sourceIndexNameValid}
            error={getSourceIndexErrorMessages()}
          >
            <Fragment>
              {!isJobCreated && (
                <EuiComboBox
                  placeholder={i18n.translate(
                    'xpack.ml.dataframe.analytics.create.sourceIndexPlaceholder',
                    {
                      defaultMessage: 'Choose a source index pattern.',
                    }
                  )}
                  singleSelection={{ asPlainText: true }}
                  options={Object.values(indexPatternsMap).sort((a, b) =>
                    a.label.localeCompare(b.label)
                  )}
                  selectedOptions={
                    indexPatternsMap[sourceIndex] !== undefined ? [{ label: sourceIndex }] : []
                  }
                  onChange={onSourceIndexChange}
                  isClearable={false}
                  data-test-subj="mlAnalyticsCreateJobFlyoutSourceIndexSelect"
                />
              )}
              {isJobCreated && (
                <EuiFieldText
                  disabled={true}
                  value={sourceIndex}
                  aria-label={i18n.translate(
                    'xpack.ml.dataframe.analytics.create.sourceIndexInputAriaLabel',
                    {
                      defaultMessage: 'Source index pattern or search.',
                    }
                  )}
                />
              )}
            </Fragment>
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.analytics.create.destinationIndexLabel', {
              defaultMessage: 'Destination index',
            })}
            isInvalid={!destinationIndexNameEmpty && !destinationIndexNameValid}
            helpText={
              destinationIndexNameExists &&
              i18n.translate('xpack.ml.dataframe.analytics.create.destinationIndexHelpText', {
                defaultMessage:
                  'An index with this name already exists. Be aware that running this analytics job will modify this destination index.',
              })
            }
            error={
              !destinationIndexNameEmpty &&
              !destinationIndexNameValid && [
                <Fragment>
                  {i18n.translate(
                    'xpack.ml.dataframe.analytics.create.destinationIndexInvalidError',
                    {
                      defaultMessage: 'Invalid destination index name.',
                    }
                  )}
                  <br />
                  <EuiLink
                    href={`${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/indices-create-index.html#indices-create-index`}
                    target="_blank"
                  >
                    {i18n.translate(
                      'xpack.ml.dataframe.stepDetailsForm.destinationIndexInvalidErrorLink',
                      {
                        defaultMessage: 'Learn more about index name limitations.',
                      }
                    )}
                  </EuiLink>
                </Fragment>,
              ]
            }
          >
            <EuiFieldText
              disabled={isJobCreated}
              placeholder="destination index"
              value={destinationIndex}
              onChange={(e) => setFormState({ destinationIndex: e.target.value })}
              aria-label={i18n.translate(
                'xpack.ml.dataframe.analytics.create.destinationIndexInputAriaLabel',
                {
                  defaultMessage: 'Choose a unique destination index name.',
                }
              )}
              isInvalid={!destinationIndexNameEmpty && !destinationIndexNameValid}
              data-test-subj="mlAnalyticsCreateJobFlyoutDestinationIndexInput"
            />
          </EuiFormRow>
          {(jobType === ANALYSIS_CONFIG_TYPE.REGRESSION ||
            jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION) && (
            <Fragment>
              <EuiFormRow
                fullWidth
                isInvalid={maxDistinctValuesError !== undefined}
                error={[
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
                <Fragment />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.ml.dataframe.analytics.create.dependentVariableLabel',
                  {
                    defaultMessage: 'Dependent variable',
                  }
                )}
                helpText={
                  dependentVariableOptions.length === 0 &&
                  dependentVariableFetchFail === false &&
                  !sourceIndexNameEmpty &&
                  i18n.translate(
                    'xpack.ml.dataframe.analytics.create.dependentVariableOptionsNoNumericalFields',
                    {
                      defaultMessage: 'No numeric type fields were found for this index pattern.',
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
                ]}
              >
                <EuiComboBox
                  aria-label={i18n.translate(
                    'xpack.ml.dataframe.analytics.create.dependentVariableInputAriaLabel',
                    {
                      defaultMessage: 'Enter field to be used as dependent variable.',
                    }
                  )}
                  placeholder={i18n.translate(
                    'xpack.ml.dataframe.analytics.create.dependentVariablePlaceholder',
                    {
                      defaultMessage: 'dependent variable',
                    }
                  )}
                  isDisabled={isJobCreated}
                  isLoading={loadingDepVarOptions}
                  singleSelection={true}
                  options={dependentVariableOptions}
                  selectedOptions={dependentVariable ? [{ label: dependentVariable }] : []}
                  onChange={(selectedOptions) =>
                    setFormState({
                      dependentVariable: selectedOptions[0].label || '',
                    })
                  }
                  isClearable={false}
                  isInvalid={dependentVariable === ''}
                  data-test-subj="mlAnalyticsCreateJobFlyoutDependentVariableSelect"
                />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.translate('xpack.ml.dataframe.analytics.create.trainingPercentLabel', {
                  defaultMessage: 'Training percent',
                })}
              >
                <EuiRange
                  min={TRAINING_PERCENT_MIN}
                  max={TRAINING_PERCENT_MAX}
                  step={1}
                  showLabels
                  showRange
                  showValue
                  value={trainingPercent}
                  // @ts-ignore Property 'value' does not exist on type 'EventTarget' | (EventTarget & HTMLInputElement)
                  onChange={(e) => setFormState({ trainingPercent: +e.target.value })}
                  data-test-subj="mlAnalyticsCreateJobFlyoutTrainingPercentSlider"
                />
              </EuiFormRow>
              {/* num_top_feature_importance_values */}
              <EuiFormRow
                label={i18n.translate(
                  'xpack.ml.dataframe.analytics.create.numTopFeatureImportanceValuesLabel',
                  {
                    defaultMessage: 'Feature importance values',
                  }
                )}
                helpText={i18n.translate(
                  'xpack.ml.dataframe.analytics.create.numTopFeatureImportanceValuesHelpText',
                  {
                    defaultMessage:
                      'Specify the maximum number of feature importance values per document to return.',
                  }
                )}
                isInvalid={numTopFeatureImportanceValuesValid === false}
                error={[
                  ...(numTopFeatureImportanceValuesValid === false
                    ? [
                        <Fragment>
                          {i18n.translate(
                            'xpack.ml.dataframe.analytics.create.numTopFeatureImportanceValuesErrorText',
                            {
                              defaultMessage:
                                'Invalid maximum number of feature importance values.',
                            }
                          )}
                        </Fragment>,
                      ]
                    : []),
                ]}
              >
                <EuiFieldNumber
                  aria-label={i18n.translate(
                    'xpack.ml.dataframe.analytics.create.numTopFeatureImportanceValuesInputAriaLabel',
                    {
                      defaultMessage: 'Maximum number of feature importance values per document.',
                    }
                  )}
                  data-test-subj="mlAnalyticsCreateJobFlyoutnumTopFeatureImportanceValuesInput"
                  disabled={false}
                  isInvalid={numTopFeatureImportanceValuesValid === false}
                  min={NUM_TOP_FEATURE_IMPORTANCE_VALUES_MIN}
                  onChange={(e) => setFormState({ numTopFeatureImportanceValues: +e.target.value })}
                  step={1}
                  value={numTopFeatureImportanceValues}
                />
              </EuiFormRow>
            </Fragment>
          )}
          <EuiFormRow
            fullWidth
            isInvalid={requiredFieldsError !== undefined}
            error={
              requiredFieldsError !== undefined && [
                i18n.translate('xpack.ml.dataframe.analytics.create.requiredFieldsError', {
                  defaultMessage: 'Invalid. {message}',
                  values: { message: requiredFieldsError },
                }),
              ]
            }
          >
            <Fragment />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.analytics.create.excludedFieldsLabel', {
              defaultMessage: 'Excluded fields',
            })}
            isInvalid={noSupportetdAnalysisFields}
            helpText={i18n.translate('xpack.ml.dataframe.analytics.create.excludedFieldsHelpText', {
              defaultMessage:
                'Select fields to exclude from analysis. All other supported fields are included.',
            })}
            error={
              noSupportetdAnalysisFields && [
                i18n.translate(
                  'xpack.ml.dataframe.analytics.create.excludesOptionsNoSupportedFields',
                  {
                    defaultMessage:
                      'No supported analysis fields were found for this index pattern.',
                  }
                ),
              ]
            }
          >
            <EuiComboBox
              aria-label={i18n.translate(
                'xpack.ml.dataframe.analytics.create.excludesInputAriaLabel',
                {
                  defaultMessage: 'Optional. Enter or select field to be excluded.',
                }
              )}
              isDisabled={isJobCreated}
              isLoading={loadingFieldOptions}
              options={excludesOptions}
              selectedOptions={excludes.map((field) => ({
                label: field,
              }))}
              onCreateOption={onCreateOption}
              onChange={(selectedOptions) =>
                setFormState({ excludes: selectedOptions.map((option) => option.label) })
              }
              isClearable={true}
              data-test-subj="mlAnalyticsCreateJobFlyoutExcludesSelect"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.analytics.create.modelMemoryLimitLabel', {
              defaultMessage: 'Model memory limit',
            })}
            isInvalid={modelMemoryLimitValidationResult !== null}
            error={mmlErrors}
          >
            <EuiFieldText
              placeholder={
                jobType !== undefined
                  ? DEFAULT_MODEL_MEMORY_LIMIT[jobType]
                  : DEFAULT_MODEL_MEMORY_LIMIT.outlier_detection
              }
              disabled={isJobCreated}
              value={modelMemoryLimit || ''}
              onChange={(e) => setFormState({ modelMemoryLimit: e.target.value })}
              isInvalid={modelMemoryLimitValidationResult !== null}
              data-test-subj="mlAnalyticsCreateJobFlyoutModelMemoryInput"
            />
          </EuiFormRow>
          <EuiFormRow
            isInvalid={createIndexPattern && destinationIndexPatternTitleExists}
            error={
              createIndexPattern &&
              destinationIndexPatternTitleExists && [
                i18n.translate('xpack.ml.dataframe.analytics.create.indexPatternExistsError', {
                  defaultMessage: 'An index pattern with this title already exists.',
                }),
              ]
            }
          >
            <EuiSwitch
              disabled={isJobCreated}
              name="mlDataFrameAnalyticsCreateIndexPattern"
              label={i18n.translate('xpack.ml.dataframe.analytics.create.createIndexPatternLabel', {
                defaultMessage: 'Create index pattern',
              })}
              checked={createIndexPattern === true}
              onChange={() => setFormState({ createIndexPattern: !createIndexPattern })}
              data-test-subj="mlAnalyticsCreateJobFlyoutCreateIndexPatternSwitch"
            />
          </EuiFormRow>
        </Fragment>
      )}
    </EuiForm>
  );
};
