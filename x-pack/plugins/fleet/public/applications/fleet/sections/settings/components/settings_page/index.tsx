/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import type { Output, Settings } from '../../../../types';

import { SettingsSection } from './settings_section';
import { OutputSection } from './output_section';

export interface SettingsPageProps {
  settings: Settings;
  outputs: Output[];
  deleteOutput: (output: Output) => void;
}

export const SettingsPage: React.FunctionComponent<SettingsPageProps> = ({
  settings,
  outputs,
  deleteOutput,
}) => {
  return (
    <>
      <EuiSpacer size="m" />
      <SettingsSection fleetServerHosts={settings.fleet_server_hosts} />
      <EuiSpacer size="m" />
      <OutputSection outputs={outputs} deleteOutput={deleteOutput} />
    </>
  );
};
