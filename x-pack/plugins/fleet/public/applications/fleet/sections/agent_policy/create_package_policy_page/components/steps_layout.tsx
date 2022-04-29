/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useMemo } from 'react';
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

import { WithHeaderLayout } from '../../../../layouts';
import type { AgentPolicy, PackageInfo, RegistryPolicyTemplate } from '../../../../types';
import type { EditPackagePolicyFrom } from '../types';

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
    const maxWidth = 770;
    return (
      <WithHeaderLayout
        restrictHeaderWidth={maxWidth}
        // restrictWidth={maxWidth}
        // leftColumn={leftColumn}
        // rightColumn={rightColumn}
        // rightColumnGrow={false}
        data-test-subj={dataTestSubj}
        // tabs={tabs.map(({ title, ...rest }) => ({ name: title, ...rest }))}
      >
        <div>Hello World</div>
      </WithHeaderLayout>
    );
  }
);
