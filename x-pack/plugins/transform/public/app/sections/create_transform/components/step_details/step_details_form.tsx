/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiAccordion,
  EuiComboBox,
  EuiLink,
  EuiSwitch,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiCallOut,
  EuiText,
} from '@elastic/eui';

import { KBN_FIELD_TYPES } from '../../../../../../../../../src/plugins/data/common';
import { toMountPoint } from '../../../../../../../../../src/plugins/kibana_react/public';

import {
  isEsIndices,
  isEsIngestPipelines,
  isPostTransformsPreviewResponseSchema,
} from '../../../../../../common/api_schemas/type_guards';
import { DEFAULT_TRANSFORM_FREQUENCY } from '../../../../../../common/constants';
import { TransformId } from '../../../../../../common/types/transform';
import { isValidIndexName } from '../../../../../../common/utils/es_utils';

import { getErrorMessage } from '../../../../../../common/utils/errors';

import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import { ToastNotificationText } from '../../../../components';
import { isHttpFetchError } from '../../../../common/request';
import { useDocumentationLinks } from '../../../../hooks/use_documentation_links';
import { SearchItems } from '../../../../hooks/use_search_items';
import { useApi } from '../../../../hooks/use_api';
import { StepDetailsTimeField } from './step_details_time_field';
import {
  getPivotQuery,
  getPreviewTransformRequestBody,
  isTransformIdValid,
} from '../../../../common';
import { EsIndexName, DataViewTitle } from './common';
import {
  continuousModeDelayValidator,
  retentionPolicyMaxAgeValidator,
  transformFrequencyValidator,
  transformSettingsMaxPageSearchSizeValidator,
} from '../../../../common/validators';
import { StepDefineExposedState } from '../step_define/common';
import { TRANSFORM_FUNCTION } from '../../../../../../common/constants';

import { getDefaultStepDetailsState, StepDetailsExposedState } from './common';

interface StepDetailsFormProps {
  overrides?: StepDetailsExposedState;
  onChange(s: StepDetailsExposedState): void;
  searchItems: SearchItems;
  stepDefineState: StepDefineExposedState;
}

export const StepDetailsForm: FC<StepDetailsFormProps> = React.memo(
  ({ overrides = {}, onChange, searchItems, stepDefineState }) => {
    const deps = useAppDependencies();
    const { capabilities } = deps.application;
    const toastNotifications = useToastNotifications();
    const { esIndicesCreateIndex } = useDocumentationLinks();

    const defaults = { ...getDefaultStepDetailsState(), ...overrides };

    const [transformId, setTransformId] = useState<TransformId>(defaults.transformId);
    const [transformDescription, setTransformDescription] = useState<string>(
      defaults.transformDescription
    );
    const [destinationIndex, setDestinationIndex] = useState<EsIndexName>(
      defaults.destinationIndex
    );
    const [destinationIngestPipeline, setDestinationIngestPipeline] = useState<string>(
      defaults.destinationIngestPipeline
    );
    const [transformIds, setTransformIds] = useState<TransformId[]>([]);
    const [indexNames, setIndexNames] = useState<EsIndexName[]>([]);
    const [ingestPipelineNames, setIngestPipelineNames] = useState<string[]>([]);

    const canCreateDataView = useMemo(
      () =>
        capabilities.savedObjectsManagement.edit === true ||
        capabilities.indexPatterns.save === true,
      [capabilities]
    );

    // Index pattern state
    const [dataViewTitles, setDataViewTitles] = useState<DataViewTitle[]>([]);
    const [createDataView, setCreateDataView] = useState(
      canCreateDataView === false ? false : defaults.createDataView
    );
    const [dataViewAvailableTimeFields, setDataViewAvailableTimeFields] = useState<string[]>([]);
    const [dataViewTimeField, setDataViewTimeField] = useState<string | undefined>();

    const onTimeFieldChanged = React.useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        // If the value is an empty string, it's not a valid selection
        if (value === '') {
          return;
        }
        // Find the time field based on the selected value
        // this is to account for undefined when user chooses not to use a date field
        const timeField = dataViewAvailableTimeFields.find((col) => col === value);

        setDataViewTimeField(timeField);
      },
      [setDataViewTimeField, dataViewAvailableTimeFields]
    );

    const { overlays, theme } = useAppDependencies();
    const api = useApi();

    // fetch existing transform IDs and indices once for form validation
    useEffect(() => {
      // use an IIFE to avoid returning a Promise to useEffect.
      (async function () {
        const { searchQuery, previewRequest: partialPreviewRequest } = stepDefineState;
        const pivotQuery = getPivotQuery(searchQuery);
        const previewRequest = getPreviewTransformRequestBody(
          searchItems.dataView.title,
          pivotQuery,
          partialPreviewRequest,
          stepDefineState.runtimeMappings
        );

        const transformPreview = await api.getTransformsPreview(previewRequest);

        if (isPostTransformsPreviewResponseSchema(transformPreview)) {
          const properties = transformPreview.generated_dest_index.mappings.properties;
          const timeFields: string[] = Object.keys(properties).filter(
            (col) => properties[col].type === 'date'
          );

          setDataViewAvailableTimeFields(timeFields);
          setDataViewTimeField(timeFields[0]);
        } else {
          toastNotifications.addDanger({
            title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingTransformPreview', {
              defaultMessage: 'An error occurred fetching the transform preview',
            }),
            text: toMountPoint(
              <ToastNotificationText
                overlays={overlays}
                theme={theme}
                text={getErrorMessage(transformPreview)}
              />,
              { theme$: theme.theme$ }
            ),
          });
        }

        const resp = await api.getTransforms();

        if (isHttpFetchError(resp)) {
          toastNotifications.addDanger({
            title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingTransformList', {
              defaultMessage: 'An error occurred getting the existing transform IDs:',
            }),
            text: toMountPoint(
              <ToastNotificationText
                overlays={overlays}
                theme={theme}
                text={getErrorMessage(resp)}
              />,
              { theme$: theme.theme$ }
            ),
          });
        } else {
          setTransformIds(resp.transforms.map((transform) => transform.id));
        }

        const [indices, ingestPipelines] = await Promise.all([
          api.getEsIndices(),
          api.getEsIngestPipelines(),
        ]);

        if (isEsIndices(indices)) {
          setIndexNames(indices.map((index) => index.name));
        } else {
          toastNotifications.addDanger({
            title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingIndexNames', {
              defaultMessage: 'An error occurred getting the existing index names:',
            }),
            text: toMountPoint(
              <ToastNotificationText
                overlays={overlays}
                theme={theme}
                text={getErrorMessage(indices)}
              />,
              { theme$: theme.theme$ }
            ),
          });
        }

        if (isEsIngestPipelines(ingestPipelines)) {
          setIngestPipelineNames(ingestPipelines.map(({ name }) => name));
        } else {
          toastNotifications.addDanger({
            title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingIngestPipelines', {
              defaultMessage: 'An error occurred getting the existing ingest pipeline names:',
            }),
            text: toMountPoint(
              <ToastNotificationText
                overlays={overlays}
                theme={theme}
                text={getErrorMessage(ingestPipelines)}
              />,
              { theme$: theme.theme$ }
            ),
          });
        }

        try {
          setDataViewTitles(await deps.data.dataViews.getTitles());
        } catch (e) {
          toastNotifications.addDanger({
            title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingDataViewTitles', {
              defaultMessage: 'An error occurred getting the existing data view titles:',
            }),
            text: toMountPoint(
              <ToastNotificationText overlays={overlays} theme={theme} text={getErrorMessage(e)} />,
              { theme$: theme.theme$ }
            ),
          });
        }
      })();
      // run once
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const dateFieldNames = searchItems.dataView.fields
      .filter((f) => f.type === KBN_FIELD_TYPES.DATE)
      .map((f) => f.name)
      .sort();

    // Continuous Mode
    const isContinuousModeAvailable = dateFieldNames.length > 0;
    const [isContinuousModeEnabled, setContinuousModeEnabled] = useState(
      defaults.isContinuousModeEnabled
    );
    const [continuousModeDateField, setContinuousModeDateField] = useState(
      isContinuousModeAvailable ? dateFieldNames[0] : ''
    );
    const [continuousModeDelay, setContinuousModeDelay] = useState(defaults.continuousModeDelay);
    const isContinuousModeDelayValid = continuousModeDelayValidator(continuousModeDelay);

    // Retention Policy
    const isRetentionPolicyAvailable = dateFieldNames.length > 0;
    const [isRetentionPolicyEnabled, setRetentionPolicyEnabled] = useState(
      defaults.isRetentionPolicyEnabled
    );
    const [retentionPolicyDateField, setRetentionPolicyDateField] = useState(
      isRetentionPolicyAvailable ? defaults.retentionPolicyDateField : ''
    );
    const [retentionPolicyMaxAge, setRetentionPolicyMaxAge] = useState(
      defaults.retentionPolicyMaxAge
    );
    const retentionPolicyMaxAgeEmpty = retentionPolicyMaxAge === '';
    const isRetentionPolicyMaxAgeValid = retentionPolicyMaxAgeValidator(retentionPolicyMaxAge);

    // Reset retention policy settings when the user disables the whole option
    useEffect(() => {
      if (!isRetentionPolicyEnabled) {
        setRetentionPolicyDateField(isRetentionPolicyAvailable ? dateFieldNames[0] : '');
        setRetentionPolicyMaxAge('');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRetentionPolicyEnabled]);

    const transformIdExists = transformIds.some((id) => transformId === id);
    const transformIdEmpty = transformId === '';
    const transformIdValid = isTransformIdValid(transformId);

    const indexNameExists = indexNames.some((name) => destinationIndex === name);
    const indexNameEmpty = destinationIndex === '';
    const indexNameValid = isValidIndexName(destinationIndex);
    const dataViewTitleExists = dataViewTitles.some((name) => destinationIndex === name);

    const [transformFrequency, setTransformFrequency] = useState(defaults.transformFrequency);
    const isTransformFrequencyValid = transformFrequencyValidator(transformFrequency);

    const [transformSettingsMaxPageSearchSize, setTransformSettingsMaxPageSearchSize] = useState(
      defaults.transformSettingsMaxPageSearchSize
    );
    const [transformSettingsDocsPerSecond] = useState(defaults.transformSettingsDocsPerSecond);

    const isTransformSettingsMaxPageSearchSizeValid = transformSettingsMaxPageSearchSizeValidator(
      transformSettingsMaxPageSearchSize
    );

    const valid =
      !transformIdEmpty &&
      transformIdValid &&
      !transformIdExists &&
      isTransformFrequencyValid &&
      isTransformSettingsMaxPageSearchSizeValid &&
      !indexNameEmpty &&
      indexNameValid &&
      (!dataViewTitleExists || !createDataView) &&
      (!isContinuousModeAvailable || (isContinuousModeAvailable && isContinuousModeDelayValid)) &&
      (!isRetentionPolicyAvailable ||
        !isRetentionPolicyEnabled ||
        (isRetentionPolicyAvailable &&
          isRetentionPolicyEnabled &&
          !retentionPolicyMaxAgeEmpty &&
          isRetentionPolicyMaxAgeValid));

    // expose state to wizard
    useEffect(() => {
      onChange({
        continuousModeDateField,
        continuousModeDelay,
        createDataView,
        isContinuousModeEnabled,
        isRetentionPolicyEnabled,
        retentionPolicyDateField,
        retentionPolicyMaxAge,
        transformId,
        transformDescription,
        transformFrequency,
        transformSettingsMaxPageSearchSize,
        transformSettingsDocsPerSecond,
        destinationIndex,
        destinationIngestPipeline,
        touched: true,
        valid,
        dataViewTimeField,
        _meta: defaults._meta,
      });
      // custom comparison
      /* eslint-disable react-hooks/exhaustive-deps */
    }, [
      continuousModeDateField,
      continuousModeDelay,
      createDataView,
      isContinuousModeEnabled,
      isRetentionPolicyEnabled,
      retentionPolicyDateField,
      retentionPolicyMaxAge,
      transformId,
      transformDescription,
      transformFrequency,
      transformSettingsMaxPageSearchSize,
      destinationIndex,
      destinationIngestPipeline,
      valid,
      dataViewTimeField,
      /* eslint-enable react-hooks/exhaustive-deps */
    ]);

    return (
      <div data-test-subj="transformStepDetailsForm">
        <EuiForm>
          <EuiFormRow
            label={i18n.translate('xpack.transform.stepDetailsForm.transformIdLabel', {
              defaultMessage: 'Transform ID',
            })}
            isInvalid={(!transformIdEmpty && !transformIdValid) || transformIdExists}
            error={[
              ...(!transformIdEmpty && !transformIdValid
                ? [
                    i18n.translate('xpack.transform.stepDetailsForm.transformIdInvalidError', {
                      defaultMessage:
                        'Must contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores only and must start and end with alphanumeric characters.',
                    }),
                  ]
                : []),
              ...(transformIdExists
                ? [
                    i18n.translate('xpack.transform.stepDetailsForm.transformIdExistsError', {
                      defaultMessage: 'A transform with this ID already exists.',
                    }),
                  ]
                : []),
            ]}
          >
            <EuiFieldText
              value={transformId}
              onChange={(e) => setTransformId(e.target.value)}
              aria-label={i18n.translate(
                'xpack.transform.stepDetailsForm.transformIdInputAriaLabel',
                {
                  defaultMessage: 'Choose a unique transform ID.',
                }
              )}
              isInvalid={(!transformIdEmpty && !transformIdValid) || transformIdExists}
              data-test-subj="transformIdInput"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.transform.stepDetailsForm.transformDescriptionLabel', {
              defaultMessage: 'Transform description',
            })}
          >
            <EuiFieldText
              placeholder={i18n.translate(
                'xpack.transform.stepDetailsForm.transformDescriptionPlaceholderText',
                { defaultMessage: 'Description (optional)' }
              )}
              value={transformDescription}
              onChange={(e) => setTransformDescription(e.target.value)}
              aria-label={i18n.translate(
                'xpack.transform.stepDetailsForm.transformDescriptionInputAriaLabel',
                {
                  defaultMessage: 'Choose an optional transform description.',
                }
              )}
              data-test-subj="transformDescriptionInput"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.transform.stepDetailsForm.destinationIndexLabel', {
              defaultMessage: 'Destination index',
            })}
            isInvalid={!indexNameEmpty && !indexNameValid}
            helpText={
              indexNameExists &&
              i18n.translate('xpack.transform.stepDetailsForm.destinationIndexHelpText', {
                defaultMessage:
                  'An index with this name already exists. Be aware that running this transform will modify this destination index.',
              })
            }
            error={
              !indexNameEmpty &&
              !indexNameValid && [
                <>
                  {i18n.translate('xpack.transform.stepDetailsForm.destinationIndexInvalidError', {
                    defaultMessage: 'Invalid destination index name.',
                  })}
                  <br />
                  <EuiLink href={esIndicesCreateIndex} target="_blank">
                    {i18n.translate(
                      'xpack.transform.stepDetailsForm.destinationIndexInvalidErrorLink',
                      {
                        defaultMessage: 'Learn more about index name limitations.',
                      }
                    )}
                  </EuiLink>
                </>,
              ]
            }
          >
            <EuiFieldText
              value={destinationIndex}
              onChange={(e) => setDestinationIndex(e.target.value)}
              aria-label={i18n.translate(
                'xpack.transform.stepDetailsForm.destinationIndexInputAriaLabel',
                {
                  defaultMessage: 'Choose a unique destination index name.',
                }
              )}
              isInvalid={!indexNameEmpty && !indexNameValid}
              data-test-subj="transformDestinationIndexInput"
            />
          </EuiFormRow>

          {ingestPipelineNames.length > 0 && (
            <EuiFormRow
              label={i18n.translate(
                'xpack.transform.stepDetailsForm.destinationIngestPipelineLabel',
                {
                  defaultMessage: 'Destination ingest pipeline',
                }
              )}
            >
              <EuiComboBox
                data-test-subj="transformDestinationPipelineSelect"
                aria-label={i18n.translate(
                  'xpack.transform.stepDetailsForm.destinationIngestPipelineAriaLabel',
                  {
                    defaultMessage: 'Select an ingest pipeline (optional)',
                  }
                )}
                placeholder={i18n.translate(
                  'xpack.transform.stepDetailsForm.destinationIngestPipelineComboBoxPlaceholder',
                  {
                    defaultMessage: 'Select an ingest pipeline (optional)',
                  }
                )}
                singleSelection={{ asPlainText: true }}
                options={ingestPipelineNames.map((label: string) => ({ label }))}
                selectedOptions={
                  destinationIngestPipeline !== '' ? [{ label: destinationIngestPipeline }] : []
                }
                onChange={(options) => setDestinationIngestPipeline(options[0]?.label ?? '')}
              />
            </EuiFormRow>
          )}

          {stepDefineState.transformFunction === TRANSFORM_FUNCTION.LATEST ? (
            <>
              <EuiSpacer size={'m'} />
              <EuiCallOut color="warning" iconType="alert" size="m">
                <p>
                  <FormattedMessage
                    id="xpack.transform.stepDetailsForm.destinationIndexWarning"
                    defaultMessage="Before you start the transform, use index templates or the {docsLink} to ensure the mappings for your destination index match the source index. Otherwise, the destination index is created with dynamic mappings. If the transform fails, check the messages tab on the Stack Management page for errors."
                    values={{
                      docsLink: (
                        <EuiLink href={esIndicesCreateIndex} target="_blank">
                          {i18n.translate('xpack.transform.stepDetailsForm.createIndexAPI', {
                            defaultMessage: 'Create index API',
                          })}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiCallOut>
              <EuiSpacer size={'m'} />
            </>
          ) : null}

          <EuiFormRow
            isInvalid={(createDataView && dataViewTitleExists) || canCreateDataView === false}
            error={[
              ...(canCreateDataView === false
                ? [
                    <EuiText size="xs" color="warning">
                      {i18n.translate('xpack.transform.stepDetailsForm.dataViewPermissionWarning', {
                        defaultMessage: 'You need permission to create data views.',
                      })}
                    </EuiText>,
                  ]
                : []),
              ...(createDataView && dataViewTitleExists
                ? [
                    i18n.translate('xpack.transform.stepDetailsForm.dataViewTitleError', {
                      defaultMessage: 'A data view with this title already exists.',
                    }),
                  ]
                : []),
            ]}
          >
            <EuiSwitch
              name="transformCreateDataView"
              disabled={canCreateDataView === false}
              label={i18n.translate('xpack.transform.stepCreateForm.createDataViewLabel', {
                defaultMessage: 'Create Kibana data view',
              })}
              checked={createDataView === true}
              onChange={() => setCreateDataView(!createDataView)}
              data-test-subj="transformCreateDataViewSwitch"
            />
          </EuiFormRow>
          {createDataView && !dataViewTitleExists && dataViewAvailableTimeFields.length > 0 && (
            <StepDetailsTimeField
              dataViewAvailableTimeFields={dataViewAvailableTimeFields}
              dataViewTimeField={dataViewTimeField}
              onTimeFieldChanged={onTimeFieldChanged}
            />
          )}

          {/* Continuous mode */}
          <EuiFormRow
            helpText={
              isContinuousModeAvailable === false
                ? i18n.translate('xpack.transform.stepDetailsForm.continuousModeError', {
                    defaultMessage:
                      'Continuous mode is not available for indices without date fields.',
                  })
                : ''
            }
          >
            <EuiSwitch
              name="transformContinuousMode"
              label={i18n.translate('xpack.transform.stepCreateForm.continuousModeLabel', {
                defaultMessage: 'Continuous mode',
              })}
              checked={isContinuousModeEnabled === true}
              onChange={() => setContinuousModeEnabled(!isContinuousModeEnabled)}
              disabled={isContinuousModeAvailable === false}
              data-test-subj="transformContinuousModeSwitch"
            />
          </EuiFormRow>
          {isContinuousModeEnabled && (
            <>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.transform.stepDetailsForm.continuousModeDateFieldLabel',
                  {
                    defaultMessage: 'Date field for continuous mode',
                  }
                )}
                helpText={i18n.translate(
                  'xpack.transform.stepDetailsForm.continuousModeDateFieldHelpText',
                  {
                    defaultMessage:
                      'Select the date field that can be used to identify new documents.',
                  }
                )}
              >
                <EuiSelect
                  options={dateFieldNames.map((text: string) => ({ text }))}
                  value={continuousModeDateField}
                  onChange={(e) => setContinuousModeDateField(e.target.value)}
                  data-test-subj="transformContinuousDateFieldSelect"
                />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.translate('xpack.transform.stepDetailsForm.continuousModeDelayLabel', {
                  defaultMessage: 'Delay',
                })}
                isInvalid={!isContinuousModeDelayValid}
                error={
                  !isContinuousModeDelayValid && [
                    i18n.translate('xpack.transform.stepDetailsForm.continuousModeDelayError', {
                      defaultMessage: 'Invalid delay format',
                    }),
                  ]
                }
                helpText={i18n.translate(
                  'xpack.transform.stepDetailsForm.continuousModeDelayHelpText',
                  {
                    defaultMessage: 'Time delay between current time and latest input data time.',
                  }
                )}
              >
                <EuiFieldText
                  placeholder={i18n.translate(
                    'xpack.transform.stepDetailsForm.continuousModeDelayPlaceholderText',
                    {
                      defaultMessage: 'delay e.g. {exampleValue}',
                      values: { exampleValue: '60s' },
                    }
                  )}
                  value={continuousModeDelay}
                  onChange={(e) => setContinuousModeDelay(e.target.value)}
                  aria-label={i18n.translate(
                    'xpack.transform.stepDetailsForm.continuousModeAriaLabel',
                    {
                      defaultMessage: 'Choose a delay.',
                    }
                  )}
                  isInvalid={!isContinuousModeDelayValid}
                  data-test-subj="transformContinuousDelayInput"
                />
              </EuiFormRow>
            </>
          )}

          {/* Retention policy */}
          <EuiFormRow
            helpText={
              isRetentionPolicyAvailable === false
                ? i18n.translate('xpack.transform.stepDetailsForm.retentionPolicyError', {
                    defaultMessage:
                      'Retention policy settings are not available for indices without date fields.',
                  })
                : ''
            }
          >
            <EuiSwitch
              name="transformRetentionPolicy"
              label={i18n.translate('xpack.transform.stepCreateForm.retentionPolicyLabel', {
                defaultMessage: 'Retention policy',
              })}
              checked={isRetentionPolicyEnabled === true}
              onChange={() => setRetentionPolicyEnabled(!isRetentionPolicyEnabled)}
              disabled={isRetentionPolicyAvailable === false}
              data-test-subj="transformRetentionPolicySwitch"
            />
          </EuiFormRow>
          {isRetentionPolicyEnabled && (
            <>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.transform.stepDetailsForm.retentionPolicyDateFieldLabel',
                  {
                    defaultMessage: 'Date field for retention policy',
                  }
                )}
                helpText={i18n.translate(
                  'xpack.transform.stepDetailsForm.retentionPolicyDateFieldHelpText',
                  {
                    defaultMessage:
                      'Select the date field that can be used to identify out of date documents in the destination index.',
                  }
                )}
              >
                <EuiSelect
                  options={dateFieldNames.map((text: string) => ({ text }))}
                  value={retentionPolicyDateField}
                  onChange={(e) => setRetentionPolicyDateField(e.target.value)}
                  data-test-subj="transformRetentionPolicyDateFieldSelect"
                />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.transform.stepDetailsForm.retentionPolicyMaxAgeLabel',
                  {
                    defaultMessage: 'Max age',
                  }
                )}
                isInvalid={!retentionPolicyMaxAgeEmpty && !isRetentionPolicyMaxAgeValid}
                error={
                  !retentionPolicyMaxAgeEmpty &&
                  !isRetentionPolicyMaxAgeValid && [
                    i18n.translate('xpack.transform.stepDetailsForm.retentionPolicyMaxAgeError', {
                      defaultMessage: 'Invalid max age format. Minimum of 60s required.',
                    }),
                  ]
                }
                helpText={i18n.translate(
                  'xpack.transform.stepDetailsForm.retentionPolicyMaxAgeHelpText',
                  {
                    defaultMessage:
                      'Documents that are older than the configured value will be removed from the destination index.',
                  }
                )}
              >
                <EuiFieldText
                  placeholder={i18n.translate(
                    'xpack.transform.stepDetailsForm.retentionPolicyMaxAgePlaceholderText',
                    {
                      defaultMessage: 'max_age e.g. {exampleValue}',
                      values: { exampleValue: '7d' },
                    }
                  )}
                  value={retentionPolicyMaxAge}
                  onChange={(e) => setRetentionPolicyMaxAge(e.target.value)}
                  aria-label={i18n.translate(
                    'xpack.transform.stepDetailsForm.retentionPolicyMaxAgeAriaLabel',
                    {
                      defaultMessage: 'Choose a max age.',
                    }
                  )}
                  isInvalid={!retentionPolicyMaxAgeEmpty && !isRetentionPolicyMaxAgeValid}
                  data-test-subj="transformRetentionPolicyMaxAgeInput"
                />
              </EuiFormRow>
            </>
          )}

          <EuiSpacer size="l" />

          <EuiAccordion
            data-test-subj="transformWizardAccordionAdvancedSettings"
            id="transformWizardAccordionAdvancedSettings"
            buttonContent={i18n.translate(
              'xpack.transform.stepDetailsForm.advancedSettingsAccordionButtonContent',
              {
                defaultMessage: 'Advanced settings',
              }
            )}
            paddingSize="s"
          >
            <EuiFormRow
              label={i18n.translate('xpack.transform.stepDetailsForm.frequencyLabel', {
                defaultMessage: 'Frequency',
              })}
              isInvalid={!isTransformFrequencyValid}
              error={
                !isTransformFrequencyValid && [
                  i18n.translate('xpack.transform.stepDetailsForm.frequencyError', {
                    defaultMessage: 'Invalid frequency format',
                  }),
                ]
              }
              helpText={i18n.translate('xpack.transform.stepDetailsForm.frequencyHelpText', {
                defaultMessage:
                  'The interval between checks for changes in the source indices when the transform is running continuously. Also determines the retry interval in the event of transient failures while the transform is searching or indexing. The minimum value is 1s and the maximum is 1h.',
              })}
            >
              <EuiFieldText
                placeholder={i18n.translate(
                  'xpack.transform.stepDetailsForm.editFlyoutFormFrequencyPlaceholderText',
                  {
                    defaultMessage: 'Default: {defaultValue}',
                    values: { defaultValue: DEFAULT_TRANSFORM_FREQUENCY },
                  }
                )}
                value={transformFrequency}
                onChange={(e) => setTransformFrequency(e.target.value)}
                aria-label={i18n.translate('xpack.transform.stepDetailsForm.frequencyAriaLabel', {
                  defaultMessage: 'Choose a frequency.',
                })}
                isInvalid={!isTransformFrequencyValid}
                data-test-subj="transformFrequencyInput"
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.transform.stepDetailsForm.maxPageSearchSizeLabel', {
                defaultMessage: 'Maximum page search size',
              })}
              isInvalid={!isTransformSettingsMaxPageSearchSizeValid}
              error={
                !isTransformSettingsMaxPageSearchSizeValid && [
                  i18n.translate('xpack.transform.stepDetailsForm.maxPageSearchSizeError', {
                    defaultMessage:
                      'max_page_search_size needs to be a number between 10 and 10000.',
                  }),
                ]
              }
              helpText={i18n.translate(
                'xpack.transform.stepDetailsForm.maxPageSearchSizeHelpText',
                {
                  defaultMessage:
                    'Defines the initial page size to use for the composite aggregation for each checkpoint.',
                }
              )}
            >
              <EuiFieldText
                placeholder={i18n.translate(
                  'xpack.transform.stepDetailsForm.editFlyoutFormMaxPageSearchSizePlaceholderText',
                  {
                    defaultMessage: 'Default: {defaultValue}',
                    values: { defaultValue: 500 },
                  }
                )}
                value={transformSettingsMaxPageSearchSize.toString()}
                onChange={(e) =>
                  setTransformSettingsMaxPageSearchSize(parseInt(e.target.value, 10))
                }
                aria-label={i18n.translate(
                  'xpack.transform.stepDetailsForm.maxPageSearchSizeAriaLabel',
                  {
                    defaultMessage: 'Choose a maximum page search size.',
                  }
                )}
                isInvalid={!isTransformFrequencyValid}
                data-test-subj="transformMaxPageSearchSizeInput"
              />
            </EuiFormRow>
          </EuiAccordion>
        </EuiForm>
      </div>
    );
  }
);
