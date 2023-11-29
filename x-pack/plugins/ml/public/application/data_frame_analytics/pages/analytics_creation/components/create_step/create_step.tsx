/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useMlKibana } from '../../../../../contexts/kibana';
import { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { Messages } from '../shared';
import { ANALYTICS_STEPS } from '../../page';
import { CreateStepFooter } from '../create_step_footer';

interface Props extends CreateAnalyticsFormProps {
  step: ANALYTICS_STEPS;
}

export const CreateStep: FC<Props> = ({ actions, state, step }) => {
  const {
    services: {
      application: { capabilities },
    },
  } = useMlKibana();

  const canCreateDataView = useMemo(
    () =>
      capabilities.savedObjectsManagement.edit === true || capabilities.indexPatterns.save === true,
    [capabilities]
  );

  const { createAnalyticsJob, setFormState, startAnalyticsJob } = actions;
  const { isAdvancedEditorValidJson, isJobCreated, isJobStarted, isValid, requestMessages } = state;
  const { createDataView, destinationIndex, destinationDataViewTitleExists, jobId, jobType } =
    state.form;

  const [startChecked, setStartChecked] = useState<boolean>(true);
  const [creationTriggered, setCreationTriggered] = useState<boolean>(false);
  const [showProgress, setShowProgress] = useState<boolean>(false);

  useEffect(() => {
    if (canCreateDataView === false) {
      setFormState({ createDataView: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capabilities]);

  if (step !== ANALYTICS_STEPS.CREATE) return null;

  const handleCreation = async () => {
    setCreationTriggered(true);
    const creationSuccess = await createAnalyticsJob();

    if (creationSuccess === false) {
      setCreationTriggered(false);
    }

    if (startChecked && creationSuccess === true) {
      setShowProgress(true);
      startAnalyticsJob();
    }
  };

  return (
    <div data-test-subj="mlAnalyticsCreateJobWizardCreateStep active">
      {!isJobCreated && !isJobStarted && (
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="s">
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
                    label={i18n.translate(
                      'xpack.ml.dataframe.analytics.create.wizardStartCheckbox',
                      {
                        defaultMessage: 'Start immediately',
                      }
                    )}
                    checked={startChecked}
                    onChange={(e) => {
                      setStartChecked(e.target.checked);
                      if (e.target.checked === false) {
                        setFormState({ createDataView: false });
                      }
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              {startChecked ? (
                <EuiFlexItem grow={false}>
                  <EuiFormRow
                    fullWidth
                    isInvalid={
                      (createDataView && destinationDataViewTitleExists) ||
                      createDataView === false ||
                      canCreateDataView === false
                    }
                    error={[
                      ...(canCreateDataView === false
                        ? [
                            <EuiText size="xs" color="warning">
                              {i18n.translate(
                                'xpack.ml.dataframe.analytics.create.dataViewPermissionWarning',
                                {
                                  defaultMessage: 'You need permission to create data views.',
                                }
                              )}
                            </EuiText>,
                          ]
                        : []),
                      ...(createDataView && destinationDataViewTitleExists
                        ? [
                            i18n.translate(
                              'xpack.ml.dataframe.analytics.create.dataViewExistsError',
                              {
                                defaultMessage:
                                  'A data view with the title {title} already exists.',
                                values: { title: destinationIndex },
                              }
                            ),
                          ]
                        : []),
                      ...(!createDataView && !destinationDataViewTitleExists
                        ? [
                            <EuiText size="xs" color="warning">
                              {i18n.translate(
                                'xpack.ml.dataframe.analytics.create.shouldCreateDataViewMessage',
                                {
                                  defaultMessage:
                                    'You may not be able to view job results if a data view is not created for the destination index.',
                                }
                              )}
                            </EuiText>,
                          ]
                        : []),
                    ]}
                  >
                    <EuiCheckbox
                      disabled={isJobCreated || canCreateDataView === false}
                      name="mlDataFrameAnalyticsCreateDataView"
                      id={'dataframe-create-data-view-checkbox'}
                      label={i18n.translate(
                        'xpack.ml.dataframe.analytics.create.createDataViewLabel',
                        {
                          defaultMessage: 'Create data view',
                        }
                      )}
                      checked={createDataView === true}
                      onChange={() => setFormState({ createDataView: !createDataView })}
                      data-test-subj="mlAnalyticsCreateJobWizardCreateDataViewCheckbox"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              className="mlAnalyticsCreateWizard__footerButton"
              disabled={
                !isValid ||
                !isAdvancedEditorValidJson ||
                (destinationDataViewTitleExists === true && createDataView === true)
              }
              onClick={handleCreation}
              fill
              isLoading={creationTriggered}
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
      {isJobCreated === true ? (
        <CreateStepFooter jobId={jobId} jobType={jobType!} showProgress={showProgress} />
      ) : null}
    </div>
  );
};
