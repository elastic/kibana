/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { HeaderMenuPortal } from '../../../../../observability/public';
import { ActionMenu } from '../../../application/action_menu';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { EnvironmentFilter } from '../EnvironmentFilter';

const HeaderFlexGroup = euiStyled(EuiFlexGroup)`
  padding: ${({ theme }) => theme.eui.gutterTypes.gutterMedium};
  background: ${({ theme }) => theme.eui.euiColorEmptyShade};
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
