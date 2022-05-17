/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';

import { FormattedMessage } from '@kbn/i18n-react';

import { EuiTitle, EuiSpacer } from '@elastic/eui';

import type { RegistryPolicyTemplate, PackageInfo } from '../../../../../types';
import { IntegrationBreadcrumb } from '../../components';
import { pkgKeyFromPackageInfo } from '../../../../../services';
import { WithHeaderLayout } from '../../../../../layouts';

import { CreatePackagePolicyBottomBar, PageSteps } from '.';

const CentralH1 = styled('h1')`
  text-align: center;
`;

export const MultiPageStepsLayout = ({
  packageInfo,
  integrationInfo,
  cancelClickHandler,
  cancelUrl,
  onNext,
}: {
  packageInfo: PackageInfo;
  integrationInfo?: RegistryPolicyTemplate;
  cancelClickHandler: React.ReactEventHandler;
  cancelUrl: string;
  onNext: () => void;
}) => {
  const topContent = (
    <>
      <EuiTitle size="l">
        <CentralH1>
          <FormattedMessage
            id="xpack.fleet.addFirstIntegrationSplash.pageTitle"
            defaultMessage="Set up {title} integration"
            values={{
              title: packageInfo.title,
            }}
          />
        </CentralH1>
      </EuiTitle>
      <EuiSpacer size="m" />
      <PageSteps
        currentStep={1}
        steps={['Install Elastic Agent', 'Add the integration', 'Confirm incoming data']}
      />
    </>
  );

  return (
    <WithHeaderLayout topContent={topContent}>
      <>
        {'hello'}
        <CreatePackagePolicyBottomBar
          cancelUrl={cancelUrl}
          cancelClickHandler={cancelClickHandler}
          onNext={onNext}
          actionMessage={
            <FormattedMessage
              id="xpack.fleet.addFirstIntegrationSplash.installAgentButton"
              defaultMessage="Add the integration"
            />
          }
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
