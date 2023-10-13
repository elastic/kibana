/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiAccordion, EuiForm, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EditTransformFlyoutFormTextInput } from './edit_transform_flyout_form_text_input';
import { EditTransformFlyoutFormTextArea } from './edit_transform_flyout_form_text_area';
import { EditTransformRetentionPolicy } from './edit_transform_retention_policy';
import { EditTransformIngestPipeline } from './edit_transform_ingest_pipeline';

export const EditTransformFlyoutForm: FC = () => (
  <EuiForm>
    <EditTransformFlyoutFormTextArea
      field="description"
      label={i18n.translate('xpack.transform.transformList.editFlyoutFormDescriptionLabel', {
        defaultMessage: 'Description',
      })}
    />
    <EditTransformFlyoutFormTextInput
      field="frequency"
      label={i18n.translate('xpack.transform.transformList.editFlyoutFormFrequencyLabel', {
        defaultMessage: 'Frequency',
      })}
      helpText={i18n.translate('xpack.transform.transformList.editFlyoutFormFrequencyHelpText', {
        defaultMessage:
          'The interval to check for changes in source indices when the transform runs continuously.',
      })}
    />

    <EuiSpacer size="l" />

    <EditTransformRetentionPolicy />

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
      <div data-test-subj="transformEditAccordionDestinationContent">
        <EditTransformFlyoutFormTextInput
          field="destinationIndex"
          label={i18n.translate(
            'xpack.transform.transformList.editFlyoutFormDestinationIndexLabel',
            {
              defaultMessage: 'Destination index',
            }
          )}
        />

        <EuiSpacer size="m" />

        <div data-test-subj="transformEditAccordionIngestPipelineContent">
          <EditTransformIngestPipeline />
        </div>
      </div>
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
          field="docsPerSecond"
          helpText={i18n.translate(
            'xpack.transform.transformList.editFlyoutFormDocsPerSecondHelpText',
            {
              defaultMessage: 'To enable throttling, set a limit of documents to input per second.',
            }
          )}
          label={i18n.translate('xpack.transform.transformList.editFlyoutFormDocsPerSecondLabel', {
            defaultMessage: 'Documents per second',
          })}
        />
        <EditTransformFlyoutFormTextInput
          field="maxPageSearchSize"
          helpText={i18n.translate(
            'xpack.transform.transformList.editFlyoutFormMaxPageSearchSizeHelpText',
            {
              defaultMessage:
                'The initial page size to use for the composite aggregation for each checkpoint.',
            }
          )}
          label={i18n.translate(
            'xpack.transform.transformList.editFlyoutFormMaxPageSearchSizeLabel',
            {
              defaultMessage: 'Maximum page search size',
            }
          )}
          placeHolder={true}
        />
        <EditTransformFlyoutFormTextInput
          field="numFailureRetries"
          helpText={i18n.translate(
            'xpack.transform.transformList.editFlyoutFormNumFailureRetriesHelpText',
            {
              defaultMessage:
                'The number of retries on a recoverable failure before the transform task is marked as failed. Set it to -1 for infinite retries.',
            }
          )}
          label={i18n.translate('xpack.transform.transformList.numFailureRetriesLabel', {
            defaultMessage: 'Number of failure retries',
          })}
        />
      </div>
    </EuiAccordion>
  </EuiForm>
);
