/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { SettingsSection as Component } from './settings_section';

export default {
  component: Component,
  title: 'Sections/Fleet/Settings',
};

interface Args {
  width: number;
  fleetServerHosts: string[];
}

const args: Args = {
  width: 1200,
  fleetServerHosts: [
    'https://myfleetserver:8220',
    'https://alongerfleetserverwithaverylongname:8220',
  ],
};

export const SettingsSection = ({ width, fleetServerHosts }: Args) => {
  return (
    <div style={{ width }}>
      <Component fleetServerHosts={fleetServerHosts} />
    </div>
  );
};

SettingsSection.args = args;
