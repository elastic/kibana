/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
// import { FormattedMessage } from '@kbn/i18n-react';
// import styled from 'styled-components';
// import {
//   EuiFlexGroup,
//   EuiFlexItem,
//   EuiText,
//   EuiDescriptionList,
//   EuiDescriptionListTitle,
//   EuiDescriptionListDescription,
//   EuiButtonEmpty,
//   EuiSpacer,
// } from '@elastic/eui';

import type { AgentPolicy, PackageInfo, RegistryPolicyTemplate } from '../../../../../types';
import type { EditPackagePolicyFrom } from '../../types';

import { AddFirstIntegrationSplashScreen } from './add_first_integration_splash';
export const CreatePackagePolicyPageStepsLayout: React.FunctionComponent<{
  from: EditPackagePolicyFrom;
  cancelUrl: string;
  onCancel?: React.ReactEventHandler;
  agentPolicy?: AgentPolicy;
  packageInfo?: PackageInfo;
  integrationInfo?: RegistryPolicyTemplate;
  'data-test-subj'?: string;
  tabs?: Array<{
    title: string;
    isSelected: boolean;
    onClick: React.ReactEventHandler;
  }>;
}> = memo(
  ({
    from,
    cancelUrl,
    onCancel,
    agentPolicy,
    packageInfo,
    integrationInfo,
    children,
    'data-test-subj': dataTestSubj,
    tabs = [],
  }) => {
    return <AddFirstIntegrationSplashScreen />;
  }
);
