/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiSteps,
  EuiStepStatus,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useMlContext } from '../../../contexts/ml';
import { newJobCapsService } from '../../../services/new_job_capabilities_service';
import { ml } from '../../../services/ml_api_service';
import { DataFrameAnalyticsId } from '../../common/analytics';
import { useCreateAnalyticsForm } from '../analytics_management/hooks/use_create_analytics_form';
import { CreateAnalyticsAdvancedEditor } from './components/create_analytics_advanced_editor';
import { AdvancedStep, ConfigurationStep, CreateStep, DetailsStep } from './components';

export enum ANALYTICS_STEPS {
  CONFIGURATION,
  ADVANCED,
  DETAILS,
  CREATE,
}

interface Props {
  jobId?: DataFrameAnalyticsId;
}

export const Page: FC<Props> = ({ jobId }) => {
  const [currentStep, setCurrentStep] = useState<ANALYTICS_STEPS>(ANALYTICS_STEPS.CONFIGURATION);
  const [activatedSteps, setActivatedSteps] = useState<boolean[]>([true, false, false, false]);

  const mlContext = useMlContext();
  const { currentIndexPattern } = mlContext;

  const createAnalyticsForm = useCreateAnalyticsForm();
  const { isAdvancedEditorEnabled } = createAnalyticsForm.state;
  const { jobType } = createAnalyticsForm.state.form;
  const { initiateWizard, setJobClone, switchToAdvancedEditor } = createAnalyticsForm.actions;

  useEffect(() => {
    initiateWizard();

    if (currentIndexPattern) {
      (async function () {
        await newJobCapsService.initializeFromIndexPattern(currentIndexPattern, false, false);

        if (jobId !== undefined) {
          const analyticsConfigs = await ml.dataFrameAnalytics.getDataFrameAnalytics(jobId);
          if (
            Array.isArray(analyticsConfigs.data_frame_analytics) &&
            analyticsConfigs.data_frame_analytics.length > 0
          ) {
            const clonedJobConfig: any = analyticsConfigs.data_frame_analytics[0];
            await setJobClone(clonedJobConfig);
          }
        }
      })();
    }
  }, []);

  useEffect(() => {
    if (activatedSteps[currentStep] === false) {
      activatedSteps.splice(currentStep, 1, true);
      setActivatedSteps(activatedSteps);
    }
  }, [currentStep]);

  const analyticsWizardSteps = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.creation.configurationStepTitle', {
        defaultMessage: 'Configuration',
      }),
      children: (
        <ConfigurationStep
          {...createAnalyticsForm}
          setCurrentStep={setCurrentStep}
          step={currentStep}
          stepActivated={activatedSteps[ANALYTICS_STEPS.CONFIGURATION]}
        />
      ),
      status:
        currentStep >= ANALYTICS_STEPS.CONFIGURATION ? undefined : ('incomplete' as EuiStepStatus),
    },
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.creation.advancedStepTitle', {
        defaultMessage: 'Additional options',
      }),
      children: (
        <AdvancedStep
          {...createAnalyticsForm}
          setCurrentStep={setCurrentStep}
          step={currentStep}
          stepActivated={activatedSteps[ANALYTICS_STEPS.ADVANCED]}
        />
      ),
      status: currentStep >= ANALYTICS_STEPS.ADVANCED ? undefined : ('incomplete' as EuiStepStatus),
    },
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.creation.detailsStepTitle', {
        defaultMessage: 'Job details',
      }),
      children: (
        <DetailsStep
          {...createAnalyticsForm}
          setCurrentStep={setCurrentStep}
          step={currentStep}
          stepActivated={activatedSteps[ANALYTICS_STEPS.DETAILS]}
        />
      ),
      status: currentStep >= ANALYTICS_STEPS.DETAILS ? undefined : ('incomplete' as EuiStepStatus),
    },
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.creation.createStepTitle', {
        defaultMessage: 'Create',
      }),
      children: <CreateStep {...createAnalyticsForm} step={currentStep} />,
      status: currentStep >= ANALYTICS_STEPS.CREATE ? undefined : ('incomplete' as EuiStepStatus),
    },
  ];

  return (
    <EuiPage data-test-subj="mlAnalyticsCreationContainer">
      <EuiPageBody restrictWidth={1200}>
        <EuiPageContent>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="m" data-test-subj="mlDataFrameAnalyticsWizardHeaderTitle">
                    <h1>
                      {jobId === undefined && (
                        <FormattedMessage
                          id="xpack.ml.dataframe.analytics.creationPageTitle"
                          defaultMessage="Create job"
                        />
                      )}
                      {jobId !== undefined && (
                        <FormattedMessage
                          id="xpack.ml.dataframe.analytics.clone.creationPageTitle"
                          defaultMessage="Clone job from {jobId}"
                          values={{ jobId }}
                        />
                      )}
                    </h1>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <h2>
                    <FormattedMessage
                      id="xpack.ml.dataframe.analytics.creationPageSourceIndexTitle"
                      defaultMessage="Source index pattern: {indexTitle}"
                      values={{ indexTitle: currentIndexPattern.title }}
                    />
                  </h2>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {isAdvancedEditorEnabled === false && (
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  helpText={i18n.translate(
                    'xpack.ml.dataframe.analytics.create.enableJsonEditorHelpText',
                    {
                      defaultMessage: 'You cannot switch back to this form from the json editor.',
                    }
                  )}
                >
                  <EuiButtonEmpty
                    isDisabled={jobType === undefined}
                    iconType="link"
                    onClick={switchToAdvancedEditor}
                    data-test-subj="mlAnalyticsCreateJobWizardAdvancedEditorSwitch"
                  >
                    <EuiText size="s" grow={false}>
                      {i18n.translate(
                        'xpack.ml.dataframe.analytics.create.switchToJsonEditorSwitch',
                        {
                          defaultMessage: 'Switch to json editor',
                        }
                      )}
                    </EuiText>
                  </EuiButtonEmpty>
                </EuiFormRow>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer />
          {isAdvancedEditorEnabled === true && (
            <CreateAnalyticsAdvancedEditor {...createAnalyticsForm} />
          )}
          {isAdvancedEditorEnabled === false && (
            <EuiSteps
              data-test-subj="mlAnalyticsCreateJobWizardSteps"
              steps={analyticsWizardSteps}
            />
          )}
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
