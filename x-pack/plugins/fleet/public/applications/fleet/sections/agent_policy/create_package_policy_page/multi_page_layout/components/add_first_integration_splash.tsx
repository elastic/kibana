/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';
import useWindowSize from 'react-use/lib/useWindowSize';

import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiImageProps } from '@elastic/eui';
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
  EuiHideFor,
  EuiShowFor,
  isWithinMaxBreakpoint,
} from '@elastic/eui';

import type { RegistryPolicyTemplate, PackageInfo } from '../../../../../types';
import { IntegrationBreadcrumb } from '../../components';
import { Error } from '../../../../../components';
import { pkgKeyFromPackageInfo } from '../../../../../services';
import { WithHeaderLayout } from '../../../../../layouts';
import { useStartServices } from '../../../../../hooks';
import type { RequestError } from '../../../../../hooks';

const CentralTitle = styled('h1')`
  text-align: center;
`;
const PaddedCentralTitle: React.FC = ({ children }) => (
  <>
    <EuiSpacer size={'s'} />
    <EuiTitle size="l">
      <CentralTitle>{children}</CentralTitle>
    </EuiTitle>
    <EuiSpacer size={'xl'} />
  </>
);

const SubtitleText = styled(EuiText)`
  max-width: 250px;
  margin: 0 auto;
  text-align: center;
`;
// step numbers are not centered in smaller layouts without this
const CenteredEuiStepNumber = styled(EuiStepNumber)`
  margin: 0 auto;
`;

// step numbers are not centered in smaller layouts without this
const CenteredEuiImage = (props: EuiImageProps) => (
  <div style={{ margin: '0 auto' }}>
    <EuiImage {...props} />
  </div>
);

const AddIntegrationStepsIllustrations = () => {
  const { http } = useStartServices();
  const assetsBasePath = http.basePath.prepend('/plugins/fleet/assets/');
  const { width } = useWindowSize();
  const isScreenSmall = isWithinMaxBreakpoint(width, 's');
  const ResponsiveStepGroup: React.FC = ({ children }) => (
    <EuiFlexGroup
      direction="column"
      gutterSize={isScreenSmall ? 'xs' : 'l'}
      alignItems="center"
      justifyContent="center"
      wrap={true}
    >
      {children}
    </EuiFlexGroup>
  );
  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceEvenly" gutterSize="none">
      <EuiFlexItem grow={false}>
        <ResponsiveStepGroup>
          <EuiFlexItem>
            <CenteredEuiStepNumber status="incomplete" number={1} />
          </EuiFlexItem>
          <EuiFlexItem>
            <div style={{ margin: '0 auto' }}>
              <CenteredEuiImage
                alt="Illustration of installing the Elastic Agent"
                src={assetsBasePath + '1_install_agent.svg'}
              />
            </div>
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
            <SubtitleText>
              <FormattedMessage
                id="xpack.fleet.addFirstIntegrationSplash.installAgentStep"
                defaultMessage="Install agents on the hosts that you want to connect to Elastic."
              />
            </SubtitleText>
          </EuiFlexItem>
        </ResponsiveStepGroup>
      </EuiFlexItem>
      <EuiShowFor sizes={['s', 'xs']}>
        <EuiFlexItem grow={false}>
          <EuiSpacer size="xl" />
        </EuiFlexItem>
      </EuiShowFor>
      <EuiHideFor sizes={['s', 'xs']}>
        <EuiFlexItem grow={false}>
          <CenteredEuiImage
            alt="Illustration of an arrow pointing from left to right"
            src={assetsBasePath + 'arrow_right_curve_over.svg'}
          />
        </EuiFlexItem>
      </EuiHideFor>
      <EuiFlexItem grow={false}>
        <ResponsiveStepGroup>
          <EuiFlexItem>
            <CenteredEuiStepNumber status="incomplete" number={2} />
          </EuiFlexItem>
          <EuiFlexItem>
            <CenteredEuiImage
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
            <SubtitleText>
              <FormattedMessage
                id="xpack.fleet.addFirstIntegrationSplash.addIntegrationStep"
                defaultMessage="Make a few selections to finalize how Elastic receives your data."
              />
            </SubtitleText>
          </EuiFlexItem>
        </ResponsiveStepGroup>
      </EuiFlexItem>
      <EuiShowFor sizes={['s', 'xs']}>
        <EuiFlexItem grow={false}>
          <EuiSpacer size="xl" />
        </EuiFlexItem>
      </EuiShowFor>
      <EuiHideFor sizes={['s', 'xs']}>
        <EuiFlexItem grow={false}>
          <CenteredEuiImage
            alt="Illustration of an arrow pointing from left to right"
            src={assetsBasePath + 'arrow_right_curve_under.svg'}
          />
        </EuiFlexItem>
      </EuiHideFor>
      <EuiFlexItem grow={false}>
        <ResponsiveStepGroup>
          <EuiFlexItem>
            <CenteredEuiStepNumber status="incomplete" number={3} />
          </EuiFlexItem>
          <EuiFlexItem>
            <CenteredEuiImage
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
            <SubtitleText>
              <FormattedMessage
                id="xpack.fleet.addFirstIntegrationSplash.confirmDataStep"
                defaultMessage="Explore and analyze the incoming data."
              />
            </SubtitleText>
          </EuiFlexItem>
        </ResponsiveStepGroup>
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

const CenteredLearnMoreLink = () => {
  const { docLinks } = useStartServices();
  return (
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        <EuiLink href={docLinks.links.fleet.guide} target="_blank">
          <FormattedMessage
            id="xpack.fleet.addFirstIntegrationSplash.learnMoreLink"
            defaultMessage="Learn more about Elastic Agent"
          />
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const InstallBottomBar: React.FC<{
  isLoading: boolean;
  cancelClickHandler: React.ReactEventHandler;
  cancelUrl: string;
  onNext: () => void;
}> = ({ isLoading, onNext, cancelClickHandler, cancelUrl }) => (
  <CenteredRoundedBottomBar>
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexItem grow={false}>
          {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
          <EuiButtonEmpty color="ghost" size="s" href={cancelUrl} onClick={cancelClickHandler}>
            <FormattedMessage
              id="xpack.fleet.addFirstIntegrationSplash.backButton"
              defaultMessage="Go back"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton color="primary" fill size="m" isLoading={isLoading} onClick={onNext}>
          {isLoading ? (
            <FormattedMessage
              id="xpack.fleet.addFirstIntegrationSplash.loading"
              defaultMessage="Loading..."
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.addFirstIntegrationSplash.installAgentButton"
              defaultMessage="Install Elastic Agent"
            />
          )}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </CenteredRoundedBottomBar>
);

export const AddFirstIntegrationSplashScreen: React.FC<{
  integrationInfo?: RegistryPolicyTemplate;
  error: RequestError | null;
  packageInfo?: PackageInfo;
  isLoading: boolean;
  cancelClickHandler: React.ReactEventHandler;
  cancelUrl: string;
  onNext: () => void;
}> = ({
  integrationInfo,
  packageInfo,
  isLoading,
  error,
  cancelUrl,
  cancelClickHandler,
  onNext,
}) => {
  if (error) {
    return (
      <Error
        title={
          <FormattedMessage
            id="xpack.fleet.addFirstIntegrationSplash.errorLoadingPackageTitle"
            defaultMessage="Error loading package information"
          />
        }
        error={error}
      />
    );
  }
  const topContent = (
    <PaddedCentralTitle>
      <FormattedMessage
        id="xpack.fleet.addFirstIntegrationSplash.pageTitle"
        defaultMessage="Ready to add your first integration?"
      />
    </PaddedCentralTitle>
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
          <CenteredLearnMoreLink />
        </NotObscuredByBottomBar>
        <InstallBottomBar
          cancelUrl={cancelUrl}
          cancelClickHandler={cancelClickHandler}
          isLoading={isLoading}
          onNext={onNext}
        />
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
