/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPanel } from '@elastic/eui';
import React from 'react';
import { InfraTabs } from './infra_tabs';
import { ServiceTabContent } from '../service_tab_content';

export function InfraOverview() {
  return (
    <ServiceTabContent tabName="infrastructure">
      <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
        <InfraTabs />
      </EuiPanel>
    </ServiceTabContent>
  );
}
