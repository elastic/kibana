/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { AppMountParameters } from '@kbn/core/public';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ClientStartServices } from '../../../../plugin';
import { ActionMenuContent } from './action_menu_content';

export const ActionMenu = ({
  appMountParameters,
  startServices,
}: {
  appMountParameters: AppMountParameters;
  startServices: ClientStartServices;
}) => (
  <HeaderMenuPortal
    setHeaderActionMenu={appMountParameters.setHeaderActionMenu}
    startServices={startServices}
  >
    <EuiFlexGroup responsive={false} gutterSize="s">
      <EuiFlexItem>
        <ActionMenuContent />
      </EuiFlexItem>
    </EuiFlexGroup>
  </HeaderMenuPortal>
);
