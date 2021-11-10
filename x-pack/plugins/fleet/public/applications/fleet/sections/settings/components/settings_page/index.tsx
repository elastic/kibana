/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import type { Settings } from '../../../../types';
import { LegacySettingsForm } from '../legacy_settings_form';

import { SettingsSection } from './settings_section';

export interface SettingsPageProps {
  settings: Settings;
}

export const SettingsPage: React.FunctionComponent<SettingsPageProps> = ({ settings }) => {
  return (
    <>
      <EuiSpacer size="m" />
      <SettingsSection fleetServerHosts={settings.fleet_server_hosts} />
      <LegacySettingsForm />
    </>
  );
};
