/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiForm, EuiAccordion, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EditTransformFlyoutFormTextInput } from './edit_transform_flyout_form_text_input';
import { UseEditTransformFlyoutReturnType } from './use_edit_transform_flyout';

interface EditTransformFlyoutFormProps {
  editTransformFlyout: UseEditTransformFlyoutReturnType;
}

export const EditTransformFlyoutForm: FC<EditTransformFlyoutFormProps> = ({
  editTransformFlyout: [state, dispatch],
}) => {
  const formFields = state.formFields;

  return (
    <EuiForm>
      <EditTransformFlyoutFormTextInput
        dataTestSubj="transformEditFlyoutDescriptionInput"
        errorMessages={formFields.description.errorMessages}
        label={i18n.translate('xpack.transform.transformList.editFlyoutFormDescriptionLabel', {
          defaultMessage: 'Description',
        })}
        onChange={(value) => dispatch({ field: 'description', value })}
        value={formFields.description.value}
      />

      <EditTransformFlyoutFormTextInput
        dataTestSubj="transformEditFlyoutFrequencyInput"
        errorMessages={formFields.frequency.errorMessages}
        helpText={i18n.translate('xpack.transform.transformList.editFlyoutFormFrequencyHelpText', {
          defaultMessage:
            'The interval between checks for changes in the source indices when the transform is running continuously. Also determines the retry interval in the event of transient failures while the transform is searching or indexing. The minimum value is 1s and the maximum is 1h.',
        })}
        label={i18n.translate('xpack.transform.transformList.editFlyoutFormFrequencyLabel', {
          defaultMessage: 'Frequency',
        })}
        onChange={(value) => dispatch({ field: 'frequency', value })}
        placeholder={i18n.translate(
          'xpack.transform.transformList.editFlyoutFormFrequencyPlaceholderText',
          {
            defaultMessage: 'Default: {defaultValue}',
            values: { defaultValue: formFields.frequency.defaultValue },
          }
        )}
        value={formFields.frequency.value}
      />

      <EuiSpacer size="l" />

      <EuiAccordion
        data-test-subj="transformEditAccordionDestination"
        id="transformEditAccordionDestination"
        buttonContent={i18n.translate(
          'xpack.transform.transformList.editFlyoutFormDestinationButtonContent',
          {
            defaultMessage: 'Destination configuration',
          }
        )}
        paddingSize="s"
      >
        <EditTransformFlyoutFormTextInput
          dataTestSubj="transformEditFlyoutDestinationIndexInput"
          errorMessages={formFields.destinationIndex.errorMessages}
          label={i18n.translate(
            'xpack.transform.transformList.editFlyoutFormDestinationIndexLabel',
            {
              defaultMessage: 'Destination index',
            }
          )}
          onChange={(value) => dispatch({ field: 'destinationIndex', value })}
          value={formFields.destinationIndex.value}
        />

        <EditTransformFlyoutFormTextInput
          dataTestSubj="transformEditFlyoutDestinationPipelineInput"
          errorMessages={formFields.destinationPipeline.errorMessages}
          label={i18n.translate(
            'xpack.transform.transformList.editFlyoutFormDestinationPipelineLabel',
            {
              defaultMessage: 'Pipeline',
            }
          )}
          onChange={(value) => dispatch({ field: 'destinationPipeline', value })}
          value={formFields.destinationPipeline.value}
        />
      </EuiAccordion>

      <EuiSpacer size="l" />

      <EuiAccordion
        data-test-subj="transformEditAccordionAdvancedSettings"
        id="transformEditAccordionAdvancedSettings"
        buttonContent={i18n.translate(
          'xpack.transform.transformList.editFlyoutFormAdvancedSettingsButtonContent',
          {
            defaultMessage: 'Advanced settings',
          }
        )}
        paddingSize="s"
      >
        <div data-test-subj="transformEditAccordionAdvancedSettingsContent">
          <EditTransformFlyoutFormTextInput
            dataTestSubj="transformEditFlyoutDocsPerSecondInput"
            errorMessages={formFields.docsPerSecond.errorMessages}
            helpText={i18n.translate(
              'xpack.transform.transformList.editFlyoutFormDocsPerSecondHelptext',
              {
                defaultMessage:
                  'To enable throttling, set a limit of documents to input per second.',
              }
            )}
            label={i18n.translate(
              'xpack.transform.transformList.editFlyoutFormDocsPerSecondLabel',
              {
                defaultMessage: 'Documents per second',
              }
            )}
            onChange={(value) => dispatch({ field: 'docsPerSecond', value })}
            value={formFields.docsPerSecond.value}
          />

          <EditTransformFlyoutFormTextInput
            dataTestSubj="transformEditFlyoutMaxPageSearchSizeInput"
            errorMessages={formFields.maxPageSearchSize.errorMessages}
            helpText={i18n.translate(
              'xpack.transform.transformList.editFlyoutFormMaxPageSearchSizeHelptext',
              {
                defaultMessage:
                  'Defines the initial page size to use for the composite aggregation for each checkpoint.',
              }
            )}
            label={i18n.translate(
              'xpack.transform.transformList.editFlyoutFormMaxPageSearchSizeLabel',
              {
                defaultMessage: 'Maximum page search size',
              }
            )}
            onChange={(value) => dispatch({ field: 'maxPageSearchSize', value })}
            value={formFields.maxPageSearchSize.value}
            placeholder={i18n.translate(
              'xpack.transform.transformList.editFlyoutFormMaxPageSearchSizePlaceholderText',
              {
                defaultMessage: 'Default: {defaultValue}',
                values: { defaultValue: formFields.maxPageSearchSize.defaultValue },
              }
            )}
          />
        </div>
      </EuiAccordion>
    </EuiForm>
  );
};
