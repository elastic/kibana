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

const getSurveyFeedbackURL = (featureUrl: string, kibanaVersion?: string) => {
  const url = new URL(featureUrl);
  if (kibanaVersion) {
    url.searchParams.append(KIBANA_VERSION_QUERY_PARAM, kibanaVersion);
  }

  return url.href;
};

interface FeatureFeedbackButtonProps {
  featureUrl: string;
  featureTestSubject: string;
}

export const FeatureFeedbackButton = ({
  featureUrl,
  featureTestSubject,
}: FeatureFeedbackButtonProps) => {
  const {
    services: { kibanaVersion },
  } = useKibanaContextForPlugin();
  return (
    <EuiButton
      href={getSurveyFeedbackURL(featureUrl, kibanaVersion)}
      target="_blank"
      color="warning"
      iconType="editorComment"
      data-test-subj={featureTestSubject}
    >
      <FormattedMessage
        id="xpack.infra.homePage.tellUsWhatYouThinkLink"
        defaultMessage="Tell us what you think!"
      />
    </EuiButton>
  );
};
