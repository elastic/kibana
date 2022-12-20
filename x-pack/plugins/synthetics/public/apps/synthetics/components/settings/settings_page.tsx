/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useParams } from 'react-router-dom';
import { EuiPanel } from '@elastic/eui';
import { AlertDefaultsForm } from './alerting_defaults/alert_defaults_form';
import { ProjectAPIKeys } from './project_api_keys/project_api_keys';
import { SettingsTabId } from './page_header';
import { ParamsList } from './global_params/params_list';
import { DataRetentionTab } from './data_retention';
import { useSettingsBreadcrumbs } from './use_settings_breadcrumbs';
import { ManagePrivateLocations } from './private_locations/manage_private_locations';

export const SettingsPage = () => {
  useSettingsBreadcrumbs();

  const { tabId } = useParams<{ tabId: SettingsTabId }>();

  const renderTab = () => {
    switch (tabId) {
      case 'api-keys':
        return <ProjectAPIKeys />;
      case 'private-locations':
        return <ManagePrivateLocations />;
      case 'data-retention':
        return <DataRetentionTab />;
      case 'params':
        return <ParamsList />;
      case 'alerting':
        return (
          <EuiPanel hasShadow={false} hasBorder={true}>
            <AlertDefaultsForm />
          </EuiPanel>
        );
      default:
        return <Redirect to="/settings/alerting" />;
    }
  };

  return <div>{renderTab()}</div>;
};
