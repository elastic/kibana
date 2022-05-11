/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';

import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiImage,
  EuiTitle,
  EuiBottomBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiStepNumber,
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiButtonEmpty,
} from '@elastic/eui';

import type { RegistryPolicyTemplate, PackageInfo } from '../../../../../types';
import { IntegrationBreadcrumb } from '..';
import { pkgKeyFromPackageInfo } from '../../../../../services';
import { WithHeaderLayout } from '../../../../../layouts';
import { useStartServices } from '../../../../../hooks';

const PaddedCentralTitle = styled('h1')`
  text-align: center;
  padding-top: 15px;
  padding-bottom: 45px;
`;
const AddIntegrationStepsIllustrations = () => {
  const { http } = useStartServices();
  const assetsBasePath = http.basePath.prepend('/plugins/fleet/assets/');

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceEvenly" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          direction="column"
          gutterSize="l"
          alignItems="center"
          justifyContent="center"
          wrap={true}
        >
          <EuiFlexItem>
            <EuiStepNumber status="incomplete" number={1} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiImage
              alt="Illustration of installing the Elastic Agent"
              src={assetsBasePath + '1_install_agent.svg'}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText textAlign="center">
              <h4>
                <FormattedMessage
                  id="xpack.fleet.addFirstIntegrationSplash.installAgentStepTitle"
                  defaultMessage="Install Elastic Agent"
                />
              </h4>
            </EuiText>
            <EuiText textAlign="center" style={{ maxWidth: '250px' }}>
              <FormattedMessage
                id="xpack.fleet.addFirstIntegrationSplash.installAgentStep"
                defaultMessage="Install agents on the hosts that you want to connect to Elastic."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiImage
          alt="Illustration of installing the Elastic Agent"
          src={assetsBasePath + 'arrow_right_curve_over.svg'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          direction="column"
          gutterSize="l"
          alignItems="center"
          justifyContent="center"
          wrap={true}
        >
          <EuiFlexItem>
            <EuiStepNumber status="incomplete" number={2} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiImage
              alt="Illustration of adding an integration"
              src={assetsBasePath + '2_add_integration.svg'}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText textAlign="center">
              <h4>
                <FormattedMessage
                  id="xpack.fleet.addFirstIntegrationSplash.addIntegrationStepTitle"
                  defaultMessage="Add the integration"
                />
              </h4>
            </EuiText>
            <EuiText textAlign="center" style={{ maxWidth: '250px' }}>
              <FormattedMessage
                id="xpack.fleet.addFirstIntegrationSplash.addIntegrationStep"
                defaultMessage="Make a few selections to finalize how Elastic receives your data."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiImage
          alt="Illustration of installing the Elastic Agent"
          src={assetsBasePath + 'arrow_right_curve_under.svg'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          direction="column"
          gutterSize="l"
          alignItems="center"
          justifyContent="center"
          wrap={true}
        >
          <EuiFlexItem>
            <EuiStepNumber status="incomplete" number={3} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiImage
              alt="Illustration of a dashboard with data"
              src={assetsBasePath + '3_confirm_data.svg'}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText textAlign="center">
              <h4>
                <FormattedMessage
                  id="xpack.fleet.addFirstIntegrationSplash.confirmDataStepTitle"
                  defaultMessage="Confirm incoming data"
                />
              </h4>
            </EuiText>
            <EuiText textAlign="center" style={{ maxWidth: '250px' }}>
              <FormattedMessage
                id="xpack.fleet.addFirstIntegrationSplash.confirmDataStep"
                defaultMessage="Explore and analyze the incoming data."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const CenteredRoundedBottomBar = styled(EuiBottomBar)`
  max-width: 820px;
  margin: 0 auto;
  border-radius: 8px 8px 0px 0px;
`;

const NotObscuredByBottomBar = styled('div')`
  padding-bottom: 100px;
`;

// TODO: add proper link
const CenteredDocLink = () => (
  <EuiFlexGroup justifyContent="spaceAround">
    <EuiFlexItem grow={false}>
      <EuiLink href="http://www.elastic.co" target="_blank">
        <FormattedMessage
          id="xpack.fleet.addFirstIntegrationSplash.learnMoreLink"
          defaultMessage="Learn more about Elastic Agent"
        />
      </EuiLink>
    </EuiFlexItem>
  </EuiFlexGroup>
);

// TODO: make buttons work
const InstallBottomBar = () => (
  <CenteredRoundedBottomBar>
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty color="ghost" size="s" onClick={() => {}}>
            <FormattedMessage
              id="xpack.fleet.addFirstIntegrationSplash.backButton"
              defaultMessage="Go back"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton color="primary" fill size="m">
          <FormattedMessage
            id="xpack.fleet.addFirstIntegrationSplash.installAgentButton"
            defaultMessage="Install Elastic Agent"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </CenteredRoundedBottomBar>
);

export const AddFirstIntegrationSplashScreen: React.FC<{
  integrationInfo?: RegistryPolicyTemplate;
  packageInfo?: PackageInfo;
}> = ({ integrationInfo, packageInfo }) => {
  const topContent = (
    <EuiTitle size="l">
      <PaddedCentralTitle>
        <FormattedMessage
          id="xpack.fleet.addFirstIntegrationSplash.pageTitle"
          defaultMessage="Ready to add your first integration?"
        />
      </PaddedCentralTitle>
    </EuiTitle>
  );
  return (
    <WithHeaderLayout topContent={topContent}>
      <>
        <EuiSpacer size="xxl" />
        <EuiSpacer size="xxl" />
        <AddIntegrationStepsIllustrations />
        <EuiSpacer size="xxl" />
        <EuiSpacer size="xxl" />
        <NotObscuredByBottomBar>
          <CenteredDocLink />
        </NotObscuredByBottomBar>
        <InstallBottomBar />
        {packageInfo && (
          <IntegrationBreadcrumb
            pkgTitle={integrationInfo?.title || packageInfo.title}
            pkgkey={pkgKeyFromPackageInfo(packageInfo)}
            integration={integrationInfo?.name}
          />
        )}
      </>
    </WithHeaderLayout>
  );
};
