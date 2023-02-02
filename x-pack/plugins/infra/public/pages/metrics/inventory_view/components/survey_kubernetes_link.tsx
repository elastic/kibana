/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export const KUBERNETES_FEEDBACK_LINK = 'https://ela.st/k8s-feedback';

interface Props {
  isPodNodeType: boolean;
}

export const SurveyKubernetesLink = ({ isPodNodeType }: Props) => {
  if (!isPodNodeType) {
    return <></>;
  }

  return (
    <EuiButton
      href={KUBERNETES_FEEDBACK_LINK}
      target="_blank"
      color="warning"
      iconType="editorComment"
    >
      <FormattedMessage
        id="xpack.infra.homePage.tellUsWhatYouThinkK8sLink"
        defaultMessage="Tell us what you think: K8s!"
      />
    </EuiButton>
  );
};
