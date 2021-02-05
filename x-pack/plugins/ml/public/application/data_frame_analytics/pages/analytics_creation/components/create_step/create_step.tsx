/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import {
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { Messages } from '../shared';
import { ANALYTICS_STEPS } from '../../page';
import { CreateStepFooter } from '../create_step_footer';

interface Props extends CreateAnalyticsFormProps {
  step: ANALYTICS_STEPS;
}

export const CreateStep: FC<Props> = ({ actions, state, step }) => {
  const { createAnalyticsJob, startAnalyticsJob } = actions;
  const { isAdvancedEditorValidJson, isJobCreated, isJobStarted, isValid, requestMessages } = state;
  const { jobId, jobType } = state.form;

  const [checked, setChecked] = useState<boolean>(true);
  const [showProgress, setShowProgress] = useState<boolean>(false);

  if (step !== ANALYTICS_STEPS.CREATE) return null;

  const handleCreation = async () => {
    await createAnalyticsJob();

    if (checked) {
      setShowProgress(true);
      startAnalyticsJob();
    }
  };

  return (
    <div data-test-subj="mlAnalyticsCreateJobWizardCreateStep active">
      {!isJobCreated && !isJobStarted && (
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiFormRow
              helpText={i18n.translate(
                'xpack.ml.dataframe.analytics.create.startCheckboxHelpText',
                {
                  defaultMessage:
                    'If unselected, job can be started later by returning to the jobs list.',
                }
              )}
            >
              <EuiCheckbox
                data-test-subj="mlAnalyticsCreateJobWizardStartJobCheckbox"
                id={'dataframe-create-start-checkbox'}
                label={i18n.translate('xpack.ml.dataframe.analytics.create.wizardStartCheckbox', {
                  defaultMessage: 'Start immediately',
                })}
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              className="mlAnalyticsCreateWizard__footerButton"
              disabled={!isValid || !isAdvancedEditorValidJson}
              onClick={handleCreation}
              fill
              data-test-subj="mlAnalyticsCreateJobWizardCreateButton"
            >
              {i18n.translate('xpack.ml.dataframe.analytics.create.wizardCreateButton', {
                defaultMessage: 'Create',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiSpacer size="s" />
      <Messages messages={requestMessages} />
      {isJobCreated === true && (
        <CreateStepFooter jobId={jobId} jobType={jobType!} showProgress={showProgress} />
      )}
    </div>
  );
};
