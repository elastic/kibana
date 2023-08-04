/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
  EuiImage,
  EuiMarkdownFormat,
  EuiPageHeader,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibanaUrl } from '../../../hooks/use_kibana_url';

interface IntroductionProps {
  isBeta?: boolean;
  guideLink: string;
}

export function Introduction({ isBeta, guideLink }: IntroductionProps) {
  const betaBadge = (
    <EuiBetaBadge
      label={i18n.translate('xpack.apm.onboarding.betaLabel', {
        defaultMessage: 'Beta',
      })}
    />
  );

  const previewImage = useKibanaUrl('/plugins/apm/assets/apm.png');

  const rightSideItems = [
    <EuiImage
      size="l"
      allowFullScreen
      fullScreenIconColor="dark"
      alt={i18n.translate(
        'xpack.apm.onboarding.introduction.imageAltDescription',
        {
          defaultMessage: 'screenshot of primary dashboard.',
        }
      )}
      url={previewImage}
    />,
  ];

  const description = i18n.translate(
    'xpack.apm.onboarding.specProvider.longDescription',
    {
      defaultMessage:
        'Application Performance Monitoring (APM) collects in-depth \
performance metrics and errors from inside your application. \
It allows you to monitor the performance of thousands of applications in real time. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: guideLink,
      },
    }
  );

  return (
    <>
      <EuiPageHeader
        iconType="apmApp"
        pageTitle={
          <>
            {i18n.translate('xpack.apm.onboarding.appName', {
              defaultMessage: 'APM',
            })}
            {isBeta && (
              <>
                &nbsp;
                {betaBadge}
              </>
            )}
          </>
        }
        description={<EuiMarkdownFormat>{description}</EuiMarkdownFormat>}
        rightSideItems={rightSideItems}
      />
    </>
  );
}
