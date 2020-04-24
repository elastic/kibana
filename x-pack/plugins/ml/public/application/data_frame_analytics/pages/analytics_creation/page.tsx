/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiSteps,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useMlContext } from '../../../contexts/ml';
import { useCreateAnalyticsForm } from '../analytics_management/hooks/use_create_analytics_form';
import { ConfigurationStep } from './components';
import { AdvancedStep } from './components';

enum ANALYTICS_STEPS {
  CONFIGURATION = 'Configuration',
  // eslint-disable-next-line @typescript-eslint/camelcase
  ADVANCED = 'Advanced',
  DETAILS = 'Details',
  CREATE = 'Create',
}

export enum ANALYTICS_STEP_NUMBERS {
  configuration = 1,
  advanced = 2,
  details = 3,
  create = 4,
}

export const Page: FC = () => {
  const [currentStep, setCurrentStep] = useState<ANALYTICS_STEP_NUMBERS>(
    ANALYTICS_STEP_NUMBERS.configuration
  );

  const mlContext = useMlContext();
  const { currentIndexPattern } = mlContext;

  const createAnalyticsForm = useCreateAnalyticsForm();

  const creationSteps = [
    {
      title: i18n.translate('xpack.dataframe.analytics.creation.configurationStepTitle', {
        defaultMessage: ANALYTICS_STEPS.CONFIGURATION,
      }),
      children: (
        <ConfigurationStep
          {...createAnalyticsForm}
          setCurrentStep={setCurrentStep}
          step={currentStep}
        />
      ),
      step: ANALYTICS_STEP_NUMBERS.configuration,
    },
    {
      title: i18n.translate('xpack.dataframe.analytics.creation.advancedStepTitle', {
        defaultMessage: ANALYTICS_STEPS.ADVANCED,
      }),
      children: (
        <AdvancedStep {...createAnalyticsForm} setCurrentStep={setCurrentStep} step={currentStep} />
      ),
      step: ANALYTICS_STEP_NUMBERS.advanced,
    },
    {
      title: i18n.translate('xpack.dataframe.analytics.creation.detailsStepTitle', {
        defaultMessage: ANALYTICS_STEPS.DETAILS,
      }),
      children: currentStep === ANALYTICS_STEP_NUMBERS.details ? <div>details</div> : <span />,
      step: ANALYTICS_STEP_NUMBERS.details,
    },
    {
      title: i18n.translate('xpack.dataframe.analytics.creation.createStepTitle', {
        defaultMessage: ANALYTICS_STEPS.CREATE,
      }),
      children: currentStep === ANALYTICS_STEP_NUMBERS.create ? <div>create</div> : <span />,
      step: ANALYTICS_STEP_NUMBERS.create,
    },
  ];
  // EuiPageBody restrictWidth={1200}
  return (
    <EuiPage data-test-subj="mlAnalyticsCreationContainer">
      <EuiPageBody>
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
          <EuiSteps steps={creationSteps} />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
