/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { AppSearchPageTemplate } from '../layout';

import { LogRetentionPanel, LogRetentionConfirmationModal } from './log_retention';

import { SETTINGS_TITLE } from '.';

export const Settings: React.FC = () => {
  return (
    <AppSearchPageTemplate pageChrome={[SETTINGS_TITLE]} pageHeader={{ pageTitle: SETTINGS_TITLE }}>
      <LogRetentionConfirmationModal />
      <LogRetentionPanel />
    </AppSearchPageTemplate>
  );
};
