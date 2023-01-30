/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiAccordion, EuiForm, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EditTransformFlyoutFormTextInputHelper } from './edit_transform_flyout_form_text_input';
import { EditTransformRetentionPolicy } from './edit_transform_retention_policy';
import { EditTransformDestinationIndex } from './edit_transform_destination_index';
import { EditTransformIngestPipeline } from './edit_transform_ingest_pipeline';
import { EditTransformDocsPerSecond } from './edit_transform_docs_per_second';
import { EditTransformMaxPageSearchSize } from './edit_transform_max_page_search_size';
import { EditTransformNumFailureRetries } from './edit_transform_num_failure_retries';

export const EditTransformFlyoutForm: FC = () => (
  <EuiForm>
    <EditTransformFlyoutFormTextInputHelper
      field="description"
      label={i18n.translate(`xpack.transform.transformList.editFlyoutFormDescriptionLabel`, {
        defaultMessage: 'Description',
      })}
    />
    <EditTransformFlyoutFormTextInputHelper
      field="frequency"
      label={i18n.translate(`xpack.transform.transformList.editFlyoutFormFrequencyLabel`, {
        defaultMessage: 'Frequency',
      })}
      helpText={i18n.translate(`xpack.transform.transformList.editFlyoutForm$FrequencyHelpText`, {
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
        <EditTransformDestinationIndex />

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
        <EditTransformDocsPerSecond />
        <EditTransformMaxPageSearchSize />
        <EditTransformNumFailureRetries />
      </div>
    </EuiAccordion>
  </EuiForm>
);
