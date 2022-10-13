/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiLink, EuiSpacer, EuiIcon } from '@elastic/eui';
import type { TutorialModuleNoticeComponent } from '@kbn/home-plugin/public';

import { useGetPackages, useLink, useStartServices } from '../../hooks';
import { pkgKeyFromPackageInfo } from '../../services';
import { FLEET_APM_PACKAGE } from '../../../common/constants';

const TutorialModuleNotice: TutorialModuleNoticeComponent = memo(({ moduleName }) => {
  const { getHref } = useLink();
  const { application } = useStartServices();
  const hasIntegrationsPermissions = application.capabilities.navLinks.integrations;
  const { data: packagesData, isLoading } = useGetPackages();

  const pkgInfo =
    !isLoading &&
    packagesData?.response &&
    packagesData.response.find((pkg) => pkg.name === moduleName && pkg.name !== FLEET_APM_PACKAGE); // APM needs special handling

  if (hasIntegrationsPermissions && pkgInfo) {
    return (
      <>
        <EuiSpacer />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.fleet.homeIntegration.tutorialModule.noticeText"
              defaultMessage="{notePrefix} A newer version of this module is {availableAsIntegrationLink}.
              To learn more about integrations and the new Elastic Agent, read our {blogPostLink}."
              values={{
                notePrefix: (
                  <EuiIcon
                    type="iInCircle"
                    style={{ verticalAlign: 'baseline' }}
                    aria-label={i18n.translate(
                      'xpack.fleet.homeIntegration.tutorialModule.noticeText.notePrefix',
                      {
                        defaultMessage: 'Note',
                      }
                    )}
                  />
                ),
                availableAsIntegrationLink: (
                  <EuiLink
                    href={getHref('integration_details_overview', {
                      pkgkey: pkgKeyFromPackageInfo(pkgInfo),
                    })}
                  >
                    <FormattedMessage
                      id="xpack.fleet.homeIntegration.tutorialModule.noticeText.integrationLink"
                      defaultMessage="available as an Elastic Agent integration"
                    />
                  </EuiLink>
                ),
                blogPostLink: (
                  <EuiLink
                    href="https://ela.st/elastic-agent-ga-announcement"
                    external
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.fleet.homeIntegration.tutorialModule.noticeText.blogPostLink"
                      defaultMessage="announcement blog post"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </>
    );
  }

  return null;
});

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default TutorialModuleNotice;
