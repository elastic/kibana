/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiSteps,
  EuiStepStatus,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useMlContext } from '../../../contexts/ml';
import { useCreateAnalyticsForm } from '../analytics_management/hooks/use_create_analytics_form';
import { AdvancedStep, ConfigurationStep, CreateStep, DetailsStep } from './components';

export enum ANALYTICS_STEPS {
  CONFIGURATION,
  ADVANCED,
  DETAILS,
  CREATE,
}

export const Page: FC = () => {
  const [currentStep, setCurrentStep] = useState<ANALYTICS_STEPS>(ANALYTICS_STEPS.CONFIGURATION);
  const [activatedSteps, setActivatedSteps] = useState<boolean[]>([true, false, false, false]);

  const mlContext = useMlContext();
  const { currentIndexPattern } = mlContext;

  const createAnalyticsForm = useCreateAnalyticsForm();

  useEffect(() => {
    if (activatedSteps[currentStep] === false) {
      activatedSteps.splice(currentStep, 1, true);
      setActivatedSteps(activatedSteps);
    }
  }, [currentStep]);

  const analyticsWizardSteps = [
    {
      title: i18n.translate('xpack.dataframe.analytics.creation.configurationStepTitle', {
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
      title: i18n.translate('xpack.dataframe.analytics.creation.advancedStepTitle', {
        defaultMessage: 'Advanced',
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
      title: i18n.translate('xpack.dataframe.analytics.creation.detailsStepTitle', {
        defaultMessage: 'Details',
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
      title: i18n.translate('xpack.dataframe.analytics.creation.createStepTitle', {
        defaultMessage: 'Create',
      }),
      children: (
        <CreateStep {...createAnalyticsForm} setCurrentStep={setCurrentStep} step={currentStep} />
      ),
      status: currentStep >= ANALYTICS_STEPS.CREATE ? undefined : ('incomplete' as EuiStepStatus),
    },
  ];

  return (
    <EuiPage data-test-subj="mlAnalyticsCreationContainer">
      <EuiPageBody restrictWidth={1200}>
        <EuiPageContent>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiTitle size="m">
                <h1>
                  <FormattedMessage
                    id="xpack.dataframe.analytics.creationPageTitle"
                    defaultMessage="Create analytics job"
                  />
                </h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <h2>
                <FormattedMessage
                  id="xpack.dataframe.analytics.creationPageSourceIndexTitle"
                  defaultMessage="Source index pattern: {indexTitle}"
                  values={{ indexTitle: currentIndexPattern.title }}
                />
              </h2>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiSteps steps={analyticsWizardSteps} />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
