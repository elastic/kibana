/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PageTemplate } from './template';
import { BackButton } from '../shared/back_button';
import { CustomLogsPanel } from '../quickstart_flows/custom_logs';

export const CustomLogsPage = () => (
  <PageTemplate>
    <BackButton />
    <CustomLogsPanel />
  </PageTemplate>
);
