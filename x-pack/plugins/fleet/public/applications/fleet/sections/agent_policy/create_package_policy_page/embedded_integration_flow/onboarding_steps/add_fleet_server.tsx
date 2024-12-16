/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer } from '@elastic/eui';

import { useCheckPermissions } from '../../../../../hooks';

import { useFleetServerTabs } from '../../../../../components';
import { Header } from '../../../../../components/fleet_server_instructions';
import { FleetServerMissingESPrivileges } from '../../../../agents/components';
import type { EmbeddedIntegrationStepsLayoutProps } from '../types';

export const AddFleetServerStepFromOnboardingHub: React.FC<EmbeddedIntegrationStepsLayoutProps> = ({
  onCancel,
  onNext,
}) => {
  const { tabs, currentTab, setCurrentTab, currentTabContent } = useFleetServerTabs(
    onCancel,
    onNext
  );

  const { permissionsError, isPermissionsLoading } = useCheckPermissions();

  return (
    <>
      <Header tabs={tabs} currentTab={currentTab} onTabClick={(id) => setCurrentTab(id)} />
      {!isPermissionsLoading && permissionsError === 'MISSING_FLEET_SERVER_SETUP_PRIVILEGES' ? (
        <FleetServerMissingESPrivileges />
      ) : (
        <>
          <EuiSpacer size="xl" />
          {currentTabContent}
        </>
      )}
    </>
  );
};
