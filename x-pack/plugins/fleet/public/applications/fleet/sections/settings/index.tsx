/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useBreadcrumbs } from '../../hooks';
import { DefaultLayout } from '../../layouts';

import { LegacySettingsForm } from './components/legacy_settings_form';

export const SettingsApp = () => {
  useBreadcrumbs('settings');

  return (
    <DefaultLayout section="settings">
      <LegacySettingsForm />
    </DefaultLayout>
  );
};
