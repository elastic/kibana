/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { HeaderMenuPortal } from '../../../../../observability/public';
import { ActionMenu } from '../../../application/action_menu';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { EnvironmentFilter } from '../EnvironmentFilter';

const HeaderFlexGroup = styled(EuiFlexGroup)`
  padding: ${({ theme }) => theme.eui.gutterTypes.gutterMedium};
  border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
`;

export function ApmHeader({ children }: { children: ReactNode }) {
  const { setHeaderActionMenu } = useApmPluginContext().appMountParameters;

  return (
    <HeaderFlexGroup alignItems="center" gutterSize="s" wrap={true}>
      <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu}>
        <ActionMenu />
      </HeaderMenuPortal>
      <EuiFlexItem>{children}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EnvironmentFilter />
      </EuiFlexItem>
    </HeaderFlexGroup>
  );
}
