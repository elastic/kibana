/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useParams } from 'react-router-dom';
import { DataRetentionTab } from './data_retention';
import { useSettingsBreadcrumbs } from './use_settings_breadcrumbs';

export const SettingsPage = () => {
  useSettingsBreadcrumbs();

  const { tabId } = useParams<{ tabId: string }>();

  if (!tabId) {
    return <Redirect to="/settings/alerting" />;
  }

  return <div>{tabId === 'alerting' ? <div>TODO: Alerting</div> : <DataRetentionTab />}</div>;
};
