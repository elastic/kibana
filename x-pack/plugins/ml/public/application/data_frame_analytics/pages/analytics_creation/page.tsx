/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiSpacer, EuiSteps, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useMlContext } from '../../../contexts/ml';

enum ANALYTICS_STEPS {
  CONFIGURATION = 'Configuration',
  // eslint-disable-next-line @typescript-eslint/camelcase
  ADVANCED = 'Advanced',
  DETAILS = 'Details',
  CREATE = 'Create',
}

export const Page: FC = () => {
  const [currentStep, setCurrentStep] = useState<ANALYTICS_STEPS>(ANALYTICS_STEPS.CONFIGURATION);
  const mlContext = useMlContext();
  const { currentIndexPattern } = mlContext;

  const creationSteps = [
    {
      title: i18n.translate('xpack.dataframe.analytics.creation.configurationStepTitle', {
        defaultMessage: ANALYTICS_STEPS.CONFIGURATION,
      }),
      children: <p>Job config</p>,
    },
    {
      title: i18n.translate('xpack.dataframe.analytics.creation.advancedStepTitle', {
        defaultMessage: ANALYTICS_STEPS.ADVANCED,
      }),
      children: <p>Advanced stuff</p>,
    },
    {
      title: i18n.translate('xpack.dataframe.analytics.creation.detailsStepTitle', {
        defaultMessage: ANALYTICS_STEPS.DETAILS,
      }),
      children: <p>Job deets</p>,
    },
    {
      title: i18n.translate('xpack.dataframe.analytics.creation.createStepTitle', {
        defaultMessage: ANALYTICS_STEPS.CREATE,
      }),
      children: <p>Get this job created</p>,
    },
  ];
  // EuiPageBody restrictWidth={1200}
  return (
    <EuiPage data-test-subj="mlAnalyticsCreationContainer">
      <EuiPageBody>
        <EuiPageContent>
          <EuiTitle size="m">
            <h1>
              <FormattedMessage
                id="xpack.dataframe.analytics.creationPageTitle"
                defaultMessage="Create analytics job from the index pattern {indexTitle}"
                values={{ indexTitle: currentIndexPattern.title }}
              />
            </h1>
          </EuiTitle>
          <EuiSpacer />
          <EuiSteps steps={creationSteps} />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
