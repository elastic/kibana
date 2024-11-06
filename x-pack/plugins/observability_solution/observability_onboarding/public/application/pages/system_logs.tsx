/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PageTemplate } from './template';
import { SystemLogsPanel } from '../quickstart_flows/system_logs';
import { BackButton } from '../shared/back_button';

export const SystemLogsPage = () => (
  <PageTemplate>
    <BackButton />
    <SystemLogsPanel />
  </PageTemplate>
);
