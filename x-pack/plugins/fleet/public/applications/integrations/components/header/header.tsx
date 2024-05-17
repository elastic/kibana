/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLinks, EuiHeaderSection, EuiHeaderSectionItem } from '@elastic/eui';
import React from 'react';

import type { AppMountParameters } from '@kbn/core/public';

import type { FleetStartServices } from '../../../../plugin';

import { DeploymentDetails } from './deployment_details';
import { HeaderPortal } from './header_portal';

export const IntegrationsHeader = ({
  setHeaderActionMenu,
  startServices,
}: {
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  startServices: Pick<FleetStartServices, 'analytics' | 'i18n' | 'theme'>;
}) => {
  return (
    <HeaderPortal {...{ setHeaderActionMenu, startServices }}>
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
