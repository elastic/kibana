/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiImage, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { AppHeader } from '@kbn/app-header';
import { useKibanaUrl } from '../../../hooks/use_kibana_url';

interface IntroductionProps {
  guideLink: string;
}

export function Introduction({ guideLink }: IntroductionProps) {
  const previewImage = useKibanaUrl('/plugins/apm/assets/apm.png');

  return (
    <>
      <AppHeader
        title={i18n.translate('xpack.apm.onboarding.appName', {
          defaultMessage: 'APM',
        })}
        description={{
          text: i18n.translate('xpack.apm.onboarding.specProvider.longDescription', {
            defaultMessage:
              'Application Performance Monitoring (APM) collects in-depth performance metrics and errors from inside your application. It allows you to monitor the performance of thousands of applications in real time.',
          }),
          learnMoreUrl: guideLink,
        }}
        spacing="largeBleed"
      />
      <EuiSpacer size="l" />
      <EuiImage
        size="l"
        allowFullScreen
        alt={i18n.translate('xpack.apm.onboarding.introduction.imageAltDescription', {
          defaultMessage: 'screenshot of primary dashboard.',
        })}
        url={previewImage}
      />
    </>
  );
}
