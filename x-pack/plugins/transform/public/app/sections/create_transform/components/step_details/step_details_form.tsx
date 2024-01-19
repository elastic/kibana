/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';

import {
  EuiAccordion,
  EuiComboBox,
  EuiSwitch,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormTextArea } from '@kbn/ml-form-utils/components/form_text_area';
import { FormTextInput } from '@kbn/ml-form-utils/components/form_text_input';
import { useIsFormValid } from '@kbn/ml-form-utils/use_is_form_valid';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { DEFAULT_TRANSFORM_FREQUENCY } from '../../../../../../common/constants';

import { getErrorMessage } from '../../../../../../common/utils/errors';

import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import { ToastNotificationText } from '../../../../components';
import { useGetEsIngestPipelines } from '../../../../hooks';
import {
  isContinuousModeDelay,
  isTransformWizardFrequency,
  integerRangeMinus1To100Validator,
  transformSettingsPageSearchSizeValidator,
} from '../../../../common/validators';

import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';
import { selectPreviewRequest } from '../../state_management/step_define_selectors';
import { stepDetailsFormSlice } from '../../state_management/step_details_slice';

import { useDataView } from '../wizard/wizard';

import { TransformRetentionPolicy } from '../../../edit_transform/components/transform_retention_policy';

import { TransformDestinationIndexForm } from './transform_destination_index_form';
import { TransformCreateDataViewForm } from './transform_create_data_view_form';
import { TransformLatestCallout } from './transform_latest_callout';

export const StepDetailsForm: FC = () => {
  const dataView = useDataView();

  const { i18n: i18nStart, theme } = useAppDependencies();
  const toastNotifications = useToastNotifications();

  const destinationIngestPipeline = useWizardSelector(
    (s) => s.stepDetails.destinationIngestPipeline
  );
  const isContinuousModeEnabled = useWizardSelector((s) => s.stepDetails.isContinuousModeEnabled);
  const continuousModeDelay = useWizardSelector((s) => s.stepDetails.continuousModeDelay);
  const continuousModeDateField = useWizardSelector((s) => s.stepDetails.continuousModeDateField);
  const transformFrequency = useWizardSelector((s) => s.stepDetails.transformFrequency);
  const transformSettingsMaxPageSearchSize = useWizardSelector(
    (s) => s.stepDetails.transformSettingsMaxPageSearchSize
  );
  const transformSettingsNumFailureRetries = useWizardSelector(
    (s) => s.stepDetails.transformSettingsNumFailureRetries
  );
  const {
    setDestinationIngestPipeline,
    setContinuousModeEnabled,
    setContinuousModeDelay,
    setContinuousModeDateField,
    setTransformFrequency,
    setTransformSettingsMaxPageSearchSize,
    setTransformSettingsNumFailureRetries,
    setValid,
  } = useWizardActions();

  const isFormValid = useIsFormValid(stepDetailsFormSlice);

  const previewRequest = useWizardSelector((state) => selectPreviewRequest(state, dataView));

  const { error: esIngestPipelinesError, data: esIngestPipelinesData } = useGetEsIngestPipelines();
  const ingestPipelineNames = esIngestPipelinesData?.map(({ name }) => name) ?? [];

  useEffect(() => {
    if (esIngestPipelinesError !== null) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingIngestPipelines', {
          defaultMessage: 'An error occurred getting the existing ingest pipeline names:',
        }),
        text: toMountPoint(
          <ToastNotificationText text={getErrorMessage(esIngestPipelinesError)} />,
          { theme, i18n: i18nStart }
        ),
      });
    }
    // custom comparison
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [esIngestPipelinesError]);

  const sourceIndexDateFieldNames = dataView.fields
    .filter((f) => f.type === KBN_FIELD_TYPES.DATE)
    .map((f) => f.name)
    .sort();

  // Continuous Mode
  const isContinuousModeAvailable = sourceIndexDateFieldNames.length > 0;
  const isContinuousModeDelayValid = isContinuousModeDelay(continuousModeDelay);
  useEffect(() => {
    if (isContinuousModeAvailable) {
      setContinuousModeDateField(sourceIndexDateFieldNames[0]);
    }
  }, []);

  const isTransformFrequencyValid = isTransformWizardFrequency(transformFrequency);

  const transformSettingsMaxPageSearchSizeErrors = transformSettingsPageSearchSizeValidator(
    transformSettingsMaxPageSearchSize
  );
  const isTransformSettingsMaxPageSearchSizeValid =
    transformSettingsMaxPageSearchSizeErrors.length === 0;

  const isTransformSettingsNumFailureRetriesValid =
    transformSettingsNumFailureRetries === undefined ||
    transformSettingsNumFailureRetries === '-' ||
    integerRangeMinus1To100Validator(transformSettingsNumFailureRetries).length === 0;

  const valid =
    isFormValid &&
    isTransformFrequencyValid &&
    isTransformSettingsMaxPageSearchSizeValid &&
    // (!dataViewTitleExists || !createDataView) &&
    (!isContinuousModeAvailable || (isContinuousModeAvailable && isContinuousModeDelayValid));

  useEffect(() => {
    setValid(valid);
  }, [valid]);

  return (
    <div data-test-subj="transformStepDetailsForm">
      <EuiForm>
        <FormTextInput
          slice={stepDetailsFormSlice}
          field="transformId"
          label={i18n.translate('xpack.transform.stepDetailsForm.transformIdLabel', {
            defaultMessage: 'Transform ID',
          })}
          ariaLabel={i18n.translate('xpack.transform.stepDetailsForm.transformIdInputAriaLabel', {
            defaultMessage: 'Choose a unique transform ID.',
          })}
        />

        <FormTextArea
          slice={stepDetailsFormSlice}
          field="description"
          label={i18n.translate('xpack.transform.stepDetailsForm.transformDescriptionLabel', {
            defaultMessage: 'Transform description',
          })}
          placeHolder={i18n.translate(
            'xpack.transform.stepDetailsForm.transformDescriptionPlaceholderText',
            { defaultMessage: 'Description (optional)' }
          )}
          ariaLabel={i18n.translate(
            'xpack.transform.stepDetailsForm.transformDescriptionInputAriaLabel',
            {
              defaultMessage: 'Choose an optional transform description.',
            }
          )}
        />

        <TransformDestinationIndexForm />

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

        <TransformLatestCallout />

        <TransformCreateDataViewForm />

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
                options={sourceIndexDateFieldNames.map((text: string) => ({ text, value: text }))}
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

        <TransformRetentionPolicy slice={stepDetailsFormSlice} previewRequest={previewRequest} />

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
                'The interval to check for changes in source indices when the transform runs continuously.',
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
            error={transformSettingsMaxPageSearchSizeErrors}
            helpText={i18n.translate('xpack.transform.stepDetailsForm.maxPageSearchSizeHelpText', {
              defaultMessage:
                'The initial page size to use for the composite aggregation for each checkpoint.',
            })}
          >
            <EuiFieldText
              placeholder={i18n.translate(
                'xpack.transform.stepDetailsForm.editFlyoutFormMaxPageSearchSizePlaceholderText',
                {
                  defaultMessage: 'Default: {defaultValue}',
                  values: { defaultValue: 500 },
                }
              )}
              value={
                transformSettingsMaxPageSearchSize
                  ? transformSettingsMaxPageSearchSize.toString()
                  : transformSettingsMaxPageSearchSize
              }
              onChange={(e) => {
                if (e.target.value !== '') {
                  const parsed = parseInt(e.target.value, 10);
                  setTransformSettingsMaxPageSearchSize(isFinite(parsed) ? parsed : undefined);
                } else {
                  setTransformSettingsMaxPageSearchSize(undefined);
                }
              }}
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
          <EuiFormRow
            data-test-subj="transformNumFailureRetriesFormRow"
            label={i18n.translate(
              'xpack.transform.stepDetailsForm.transformNumFailureRetriesLabel',
              {
                defaultMessage: 'Number of failure retries',
              }
            )}
            isInvalid={!isTransformSettingsNumFailureRetriesValid}
            error={
              !isTransformSettingsNumFailureRetriesValid && [
                i18n.translate('xpack.transform.stepDetailsForm.NumFailureRetriesError', {
                  defaultMessage:
                    'Number of retries needs to be between 0 and 100, or -1 for infinite retries.',
                }),
              ]
            }
            helpText={i18n.translate(
              'xpack.transform.stepDetailsForm.transformNumRetriesHelpText',
              {
                defaultMessage:
                  'The number of retries on a recoverable failure before the transform task is marked as failed. Set it to -1 for infinite retries.',
              }
            )}
          >
            <EuiFieldText
              value={
                transformSettingsNumFailureRetries ||
                (transformSettingsNumFailureRetries !== undefined &&
                  transformSettingsNumFailureRetries >= -1)
                  ? transformSettingsNumFailureRetries.toString()
                  : ''
              }
              onChange={(e) => {
                if (e.target.value === '') {
                  setTransformSettingsNumFailureRetries(undefined);
                  return;
                }
                setTransformSettingsNumFailureRetries(
                  e.target.value === '-' ? '-' : parseInt(e.target.value, 10)
                );
              }}
              aria-label={i18n.translate(
                'xpack.transform.stepDetailsForm.numFailureRetriesAriaLabel',
                {
                  defaultMessage: 'Choose a maximum number of retries.',
                }
              )}
              isInvalid={!isTransformSettingsNumFailureRetriesValid}
              data-test-subj="transformNumFailureRetriesInput"
            />
          </EuiFormRow>
        </EuiAccordion>
      </EuiForm>
    </div>
  );
};
