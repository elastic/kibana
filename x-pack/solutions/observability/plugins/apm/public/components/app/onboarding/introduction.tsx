/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiPageSection,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AppHeader } from '@kbn/app-header';
import { useKibanaUrl } from '../../../hooks/use_kibana_url';
import { useApmAppMenuConfig } from '../../routing/app_root/apm_app_menu/apm_app_menu_context';

interface IntroductionProps {
  guideLink: string;
}

export function Introduction({ guideLink }: IntroductionProps) {
  const previewImage = useKibanaUrl('/plugins/apm/assets/apm.png');
  // Global APM actions (Anomaly detection, Alerts, SLOs, Settings, Add data) —
  // inline AppHeader pages own the menu (kibana-team#3549), matching ApmMainTemplate.
  const appMenu = useApmAppMenuConfig();

  return (
    <>
      {/*
       * Header bar rendered outside the padded section with the same
       * `standard` spacing as ApmMainTemplate pages (service inventory etc.):
       * title on the left, global actions on the right, underline across the
       * full page width.
       */}
      <AppHeader
        title={i18n.translate('xpack.apm.onboarding.appName', {
          defaultMessage: 'APM',
        })}
        menu={appMenu}
        spacing="standard"
      />
      <EuiPageSection paddingSize="m" restrictWidth={false} bottomBorder={false}>
        <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
          <EuiFlexItem>
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.apm.onboarding.specProvider.longDescription"
                defaultMessage="Application Performance Monitoring (APM) collects in-depth
            performance metrics and errors from inside your application.
            It allows you to monitor the performance of thousands of applications in real time.
            {learnMoreLink}."
                values={{
                  learnMoreLink: (
                    <EuiLink
                      data-test-subj="apmIntroductionLearnMoreLink"
                      href={guideLink}
                      aria-label={i18n.translate(
                        'xpack.apm.onboarding.specProvider.learnMoreAriaLabel',
                        {
                          defaultMessage: 'Learn more about APM',
                        }
                      )}
                      target="_blank"
                    >
                      {i18n.translate('xpack.apm.onboarding.specProvider.learnMoreLabel', {
                        defaultMessage: 'Learn more',
                      })}
                    </EuiLink>
                  ),
                }}
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiImage
              size="l"
              allowFullScreen
              fullScreenIconColor="dark"
              alt={i18n.translate('xpack.apm.onboarding.introduction.imageAltDescription', {
                defaultMessage: 'screenshot of primary dashboard.',
              })}
              url={previewImage}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageSection>
    </>
  );
}
