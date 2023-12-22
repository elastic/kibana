/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibanaContextForPlugin } from '../hooks/use_kibana';

const KIBANA_VERSION_QUERY_PARAM = 'entry.548460210';
const KIBANA_DEPLOYMENT_TYPE_PARAM = 'entry.573002982';

const getDeploymentType = (isCloudEnv: boolean, isServerlessEnv: boolean): string | undefined => {
  if (isServerlessEnv) {
    return 'Serverless (fully-managed projects)';
  }
  if (isCloudEnv) {
    return 'Elastic Cloud (we manage)';
  }
  return 'Self-Managed (you manage)';
};

const getSurveyFeedbackURL = (formUrl: string, kibanaVersion?: string, deploymentType?: string) => {
  const url = new URL(formUrl);
  if (kibanaVersion) {
    url.searchParams.append(KIBANA_VERSION_QUERY_PARAM, kibanaVersion);
  }
  if (deploymentType) {
    url.searchParams.append(KIBANA_DEPLOYMENT_TYPE_PARAM, deploymentType);
  }

  return url.href;
};

interface FeatureFeedbackButtonProps {
  formUrl: string;
  'data-test-subj': string;
  surveyButtonText?: ReactElement;
  onClickCapture?: () => void;
  defaultButton?: boolean;
}

export const FeatureFeedbackButton = ({
  formUrl,
  'data-test-subj': dts,
  onClickCapture,
  defaultButton,
  surveyButtonText = (
    <FormattedMessage
      id="xpack.infra.homePage.tellUsWhatYouThinkLink"
      defaultMessage="Tell us what you think!"
    />
  ),
}: FeatureFeedbackButtonProps) => {
  const {
    services: { kibanaVersion, isCloudEnv, isServerlessEnv },
  } = useKibanaContextForPlugin();

  const deploymentType = getDeploymentType(isCloudEnv, isServerlessEnv);
  return (
    <EuiButton
      href={getSurveyFeedbackURL(formUrl, kibanaVersion, deploymentType)}
      target="_blank"
      color={defaultButton ? undefined : 'warning'}
      iconType={defaultButton ? undefined : 'editorComment'}
      data-test-subj={dts}
      onClickCapture={onClickCapture}
    >
      {surveyButtonText}
    </EuiButton>
  );
};
