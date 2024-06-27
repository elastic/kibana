/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../lib/kibana';
import { useOnboardingStyles } from '../landing_page/onboarding/styles/onboarding.styles';

export const AVCResultsBanner2024: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  const { docLinks } = useKibana().services;
  const bannerTitle = i18n.translate('xpack.securitySolution.app.avcResultsBanner.title', {
    defaultMessage: '100% protection with zero false positives.',
  });

  const { calloutStyles } = useOnboardingStyles();

  return (
    <EuiCallOut
      title={bannerTitle}
      color="success"
      iconType="cheer"
      onDismiss={onDismiss}
      className={calloutStyles}
    >
      <FormattedMessage
        id="xpack.securitySolution.app.avcResultsBanner.body"
        defaultMessage="Elastic security shines in Malware Protection Test by AV-Comparatives"
      />
      <EuiSpacer size="s" />
      <EuiButton size="s" color="success" href={docLinks.links.securitySolution.avcResults}>
        <FormattedMessage
          id="xpack.securitySolution.app.avcResults.readTheBlog.link"
          defaultMessage="Read the blog"
        />
      </EuiButton>
    </EuiCallOut>
  );
};
