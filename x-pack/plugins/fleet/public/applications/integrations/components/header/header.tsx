/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHeaderSectionItem, EuiHeaderSection, EuiHeaderLinks } from '@elastic/eui';

import type { AppMountParameters } from '@kbn/core/public';

import { HeaderPortal } from './header_portal';
import { DeploymentDetails } from './deployment_details';

export const IntegrationsHeader = ({
  setHeaderActionMenu,
  theme$,
}: {
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  theme$: AppMountParameters['theme$'];
}) => {
  return (
    <HeaderPortal {...{ setHeaderActionMenu, theme$ }}>
      <EuiHeaderSection grow={false}>
        <EuiHeaderSectionItem>
          <EuiHeaderLinks>
            <DeploymentDetails />
          </EuiHeaderLinks>
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
    </HeaderPortal>
  );
};
