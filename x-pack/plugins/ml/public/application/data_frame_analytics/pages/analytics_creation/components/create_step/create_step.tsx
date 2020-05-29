/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState } from 'react';
import { EuiButton, EuiCheckbox, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { Messages } from '../../../analytics_management/components/create_analytics_form/messages';
import { ANALYTICS_STEPS } from '../../page';
import { BackToListPanel } from '../back_to_list_panel';

export const CreateStep: FC<CreateAnalyticsStepProps> = ({ actions, state, step }) => {
  const { createAnalyticsJob, startAnalyticsJob } = actions;
  const {
    isAdvancedEditorValidJson,
    isJobCreated,
    isJobStarted,
    isModalButtonDisabled,
    isValid,
    requestMessages,
  } = state;

  const [checked, setChecked] = useState<boolean>(true);

  if (step !== ANALYTICS_STEPS.CREATE) return null;

  const handleCreation = async () => {
    await createAnalyticsJob();

    if (checked) {
      startAnalyticsJob();
    }
  };

  return (
    <Fragment>
      <Messages messages={requestMessages} />
      {!isJobCreated && !isJobStarted && (
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiFormRow
              helpText={i18n.translate(
                'xpack.ml.dataframe.analytics.create.startCheckboxHelpText',
                {
                  defaultMessage:
                    'If unselected, transform can be started later by returning to the transforms list.',
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
              disabled={!isValid || !isAdvancedEditorValidJson || isModalButtonDisabled}
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
      {isJobCreated === true && <BackToListPanel />}
    </Fragment>
  );
};
