/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText, EuiLink, EuiSpacer } from '@elastic/eui';
import type { TutorialModuleNoticeComponent } from 'src/plugins/home/public';

import { useGetPackages, useLink, useCapabilities } from '../../hooks';
import { pkgKeyFromPackageInfo } from '../../services';

const TutorialModuleNotice: TutorialModuleNoticeComponent = memo(({ moduleName }) => {
  const { getHref } = useLink();
  const { show: hasIngestManager } = useCapabilities();
  const { data: packagesData, isLoading } = useGetPackages();

  const pkgInfo =
    !isLoading &&
    packagesData?.response &&
    packagesData.response.find((pkg) => pkg.name === moduleName);

  if (hasIngestManager && pkgInfo) {
    return (
      <>
        <EuiSpacer />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.fleet.homeIntegration.tutorialModule.noticeText"
              defaultMessage="{notePrefix} a newer version of this module is {availableAsIntegrationLink}.
              To learn more about integrations and the new Elastic Agent, read our {blogPostLink}."
              values={{
                notePrefix: (
                  <strong>
                    <FormattedMessage
                      id="xpack.fleet.homeIntegration.tutorialModule.noticeText.notePrefix"
                      defaultMessage="Note:"
                    />
                  </strong>
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
