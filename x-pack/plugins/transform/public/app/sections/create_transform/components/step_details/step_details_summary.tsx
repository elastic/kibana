/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiAccordion, EuiFormRow, EuiSpacer } from '@elastic/eui';

import { StepDetailsExposedState } from './step_details_form';

export const StepDetailsSummary: FC<StepDetailsExposedState> = React.memo((props) => {
  const {
    continuousModeDateField,
    createIndexPattern,
    isContinuousModeEnabled,
    transformId,
    transformDescription,
    transformFrequency,
    transformSettingsMaxPageSearchSize,
    destinationIndex,
    touched,
    indexPatternTimeField,
  } = props;

  if (touched === false) {
    return null;
  }

  const destinationIndexHelpText = createIndexPattern
    ? i18n.translate('xpack.transform.stepDetailsSummary.createIndexPatternMessage', {
        defaultMessage: 'A Kibana index pattern will be created for this transform.',
      })
    : '';

  return (
    <div data-test-subj="transformStepDetailsSummary">
      <EuiFormRow
        label={i18n.translate('xpack.transform.stepDetailsSummary.transformIdLabel', {
          defaultMessage: 'Transform ID',
        })}
      >
        <span>{transformId}</span>
      </EuiFormRow>

      {transformDescription !== '' && (
        <EuiFormRow
          label={i18n.translate('xpack.transform.stepDetailsSummary.transformDescriptionLabel', {
            defaultMessage: 'Transform description',
          })}
        >
          <span>{transformDescription}</span>
        </EuiFormRow>
      )}

      <EuiFormRow
        helpText={destinationIndexHelpText}
        label={i18n.translate('xpack.transform.stepDetailsSummary.destinationIndexLabel', {
          defaultMessage: 'Destination index',
        })}
      >
        <span>{destinationIndex}</span>
      </EuiFormRow>
      {createIndexPattern && indexPatternTimeField !== undefined && indexPatternTimeField !== '' && (
        <EuiFormRow
          label={i18n.translate('xpack.transform.stepDetailsSummary.indexPatternTimeFieldLabel', {
            defaultMessage: 'Kibana index pattern time field',
          })}
        >
          <span>{indexPatternTimeField}</span>
        </EuiFormRow>
      )}

      {isContinuousModeEnabled && (
        <EuiFormRow
          label={i18n.translate('xpack.transform.stepDetailsSummary.continuousModeDateFieldLabel', {
            defaultMessage: 'Continuous mode date field',
          })}
        >
          <span>{continuousModeDateField}</span>
        </EuiFormRow>
      )}

      <EuiSpacer size="l" />

      <EuiAccordion
        data-test-subj="transformWizardAccordionAdvancedSettingsSummary"
        id="transformWizardAccordionAdvancedSettingsSummary"
        buttonContent={i18n.translate(
          'xpack.transform.stepDetailsSummary.advancedSettingsAccordionButtonContent',
          {
            defaultMessage: 'Advanced settings',
          }
        )}
        paddingSize="s"
      >
        <EuiFormRow
          data-test-subj={'transformWizardAdvancedSettingsFrequencyLabel'}
          label={i18n.translate('xpack.transform.stepDetailsSummary.frequencyLabel', {
            defaultMessage: 'Frequency',
          })}
        >
          <span>{transformFrequency}</span>
        </EuiFormRow>
        <EuiFormRow
          data-test-subj={'transformWizardAdvancedSettingsMaxPageSearchSizeLabel'}
          label={i18n.translate('xpack.transform.stepDetailsSummary.maxPageSearchSizeLabel', {
            defaultMessage: 'Maximum page search size',
          })}
        >
          <span>{transformSettingsMaxPageSearchSize}</span>
        </EuiFormRow>
      </EuiAccordion>
    </div>
  );
});
