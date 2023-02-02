/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiLink, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  isIntegrationPolicyTemplate,
  isPackagePrerelease,
} from '../../../../../../../../common/services';

import { useFleetStatus, useLink, useStartServices } from '../../../../../../../hooks';
import { isPackageUnverified } from '../../../../../../../services';
import type { PackageInfo, RegistryPolicyTemplate } from '../../../../../types';

import { Screenshots } from './screenshots';
import { Readme } from './readme';
import { Details } from './details';

interface Props {
  packageInfo: PackageInfo;
  integrationInfo?: RegistryPolicyTemplate;
  latestGAVersion?: string;
}

const LeftColumn = styled(EuiFlexItem)`
  /* 🤢🤷 https://www.styled-components.com/docs/faqs#how-can-i-override-styles-with-higher-specificity */
  &&& {
    margin-top: 77px;
  }
`;

const UnverifiedCallout: React.FC = () => {
  const { docLinks } = useStartServices();

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.fleet.epm.verificationWarningCalloutTitle', {
          defaultMessage: 'Integration not verified',
        })}
        iconType="alert"
        color="warning"
      >
        <p>
          <FormattedMessage
            id="xpack.fleet.epm.verificationWarningCalloutIntroText"
            defaultMessage="This integration contains an unsigned package of unknown authenticity. Learn more about {learnMoreLink}."
            values={{
              learnMoreLink: (
                <EuiLink target="_blank" external href={docLinks.links.fleet.packageSignatures}>
                  <FormattedMessage
                    id="xpack.fleet.epm.verificationWarningCalloutLearnMoreLink"
                    defaultMessage="package signatures"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
};

const PrereleaseCallout: React.FC<{
  packageName: string;
  latestGAVersion?: string;
  packageTitle: string;
}> = ({ packageName, packageTitle, latestGAVersion }) => {
  const { getHref } = useLink();
  const overviewPathLatestGA = getHref('integration_details_overview', {
    pkgkey: `${packageName}-${latestGAVersion}`,
  });

  return (
    <>
      <EuiCallOut
        data-test-subj="prereleaseCallout"
        title={i18n.translate('xpack.fleet.epm.prereleaseWarningCalloutTitle', {
          defaultMessage: 'This is a pre-release version of {packageTitle} integration.',
          values: {
            packageTitle,
          },
        })}
        iconType="iInCircle"
        color="warning"
      >
        {latestGAVersion && (
          <p>
            <EuiButton href={overviewPathLatestGA} color="warning" data-test-subj="switchToGABtn">
              <FormattedMessage
                id="xpack.fleet.epm.prereleaseWarningCalloutSwitchToGAButton"
                defaultMessage="Switch to latest GA version"
              />
            </EuiButton>
          </p>
        )}
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
};

export const OverviewPage: React.FC<Props> = memo(
  ({ packageInfo, integrationInfo, latestGAVersion }) => {
    const screenshots = useMemo(
      () => integrationInfo?.screenshots || packageInfo.screenshots || [],
      [integrationInfo, packageInfo.screenshots]
    );
    const { packageVerificationKeyId } = useFleetStatus();
    const isUnverified = isPackageUnverified(packageInfo, packageVerificationKeyId);
    const isPrerelease = isPackagePrerelease(packageInfo.version);
    return (
      <EuiFlexGroup alignItems="flexStart">
        <LeftColumn grow={2} />
        <EuiFlexItem grow={9} className="eui-textBreakWord">
          {isUnverified && <UnverifiedCallout />}
          {isPrerelease && (
            <PrereleaseCallout
              packageName={packageInfo.name}
              packageTitle={packageInfo.title}
              latestGAVersion={latestGAVersion}
            />
          )}
          {packageInfo.readme ? (
            <Readme
              readmePath={
                integrationInfo &&
                isIntegrationPolicyTemplate(integrationInfo) &&
                integrationInfo?.readme
                  ? integrationInfo?.readme
                  : packageInfo.readme
              }
              packageName={packageInfo.name}
              version={packageInfo.version}
            />
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <EuiFlexGroup direction="column" gutterSize="l" alignItems="flexStart">
            {screenshots.length ? (
              <EuiFlexItem>
                <Screenshots
                  images={screenshots}
                  packageName={packageInfo.name}
                  version={packageInfo.version}
                />
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem>
              <Details packageInfo={packageInfo} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
