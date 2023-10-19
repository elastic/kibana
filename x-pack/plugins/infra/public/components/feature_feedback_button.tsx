/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibanaContextForPlugin } from '../hooks/use_kibana';

const KIBANA_VERSION_QUERY_PARAM = 'entry.548460210';
const KIBANA_DEPLOYMENT_TYPE_PARAM = 'entry.573002982';

const getDeploymentType = (
  isCloudEnabled?: boolean,
  isServerlessEnabled?: boolean
): string | undefined => {
  if (isServerlessEnabled) {
    return 'Serverless (fully-managed projects)';
  }
  if (isCloudEnabled) {
    return 'Elastic Cloud (we manage)';
  }
  if (isCloudEnabled === false) {
    return 'Self-Managed (you manage)';
  }
  return undefined;
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
}

export const FeatureFeedbackButton = ({
  formUrl,
  'data-test-subj': dts,
}: FeatureFeedbackButtonProps) => {
  const {
    services: { kibanaVersion, isCloudEnabled, isServerlessEnabled },
  } = useKibanaContextForPlugin();

  const deploymentType = getDeploymentType(isCloudEnabled, isServerlessEnabled);
  return (
    <EuiButton
      href={getSurveyFeedbackURL(formUrl, kibanaVersion, deploymentType)}
      target="_blank"
      color="warning"
      iconType="editorComment"
      data-test-subj={dts}
    >
      <FormattedMessage
        id="xpack.infra.homePage.tellUsWhatYouThinkLink"
        defaultMessage="Tell us what you think!"
      />
    </EuiButton>
  );
};
