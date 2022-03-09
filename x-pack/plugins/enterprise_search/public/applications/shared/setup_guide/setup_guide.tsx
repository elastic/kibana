/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiPage,
  EuiPageSideBar,
  EuiPageBody,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiIcon,
} from '@elastic/eui';

import { KibanaLogic } from '../kibana';

import { CloudSetupInstructions } from './cloud/instructions';
import { SETUP_GUIDE_TITLE } from './constants';
import { SetupInstructions } from './instructions';
import './setup_guide.scss';

/**
 * Shared Setup Guide component. Sidebar content and product name/links are
 * customizable, but the basic layout and instruction steps are DRYed out
 */

interface Props {
  children: React.ReactNode;
  productName: string;
  productEuiIcon: 'logoAppSearch' | 'logoWorkplaceSearch' | 'logoEnterpriseSearch';
}

export const SetupGuideLayout: React.FC<Props> = ({ children, productName, productEuiIcon }) => {
  const { cloud } = useValues(KibanaLogic);
  const isCloudEnabled = Boolean(cloud.isCloudEnabled);
  const cloudDeploymentLink = cloud.deploymentUrl || '';

  return (
    <EuiPage className="setupGuide" data-test-subj="setupGuide">
      <EuiPageSideBar className="setupGuide__sidebar">
        <EuiText color="subdued" size="s">
          <strong>{SETUP_GUIDE_TITLE}</strong>
        </EuiText>
        <EuiSpacer size="s" />

        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={productEuiIcon} size="l" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h1>{productName}</h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        {children}
      </EuiPageSideBar>

      <EuiPageBody className="setupGuide__body">
        {isCloudEnabled ? (
          <CloudSetupInstructions
            productName={productName}
            cloudDeploymentLink={cloudDeploymentLink}
          />
        ) : (
          <SetupInstructions productName={productName} />
        )}
      </EuiPageBody>
    </EuiPage>
  );
};
