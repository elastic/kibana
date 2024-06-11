/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const AVCResultsBanner2024: React.FC<OptInMessageProps> = (props) => {
  const bannerTitle = i18n.translate('xpack.securitySolution.app.avcResultsBanner.title', {
    defaultMessage: '100% protection with zero false positives.',
  });

  return (
    <EuiCallOut title={bannerTitle} color="success" iconType="cheer">
      <FormattedMessage
        id="xpack.securitySolution.app.avcResultsBanner.body"
        defaultMessage="Elastic security shines in Malware Protection Test by AV-Comparatives"
      />
      <EuiSpacer size="s" />
      <EuiButton size="s" onClick={console.log('read the blog')}>
        <FormattedMessage
          id="xpack.securitySolution.app.avcResults.readTheBlog.link"
          defaultMessage="Read the blog"
        />
      </EuiButton>
    </EuiCallOut>
  );
};
