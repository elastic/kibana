/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { InfrastructureTabHelpPopover } from './infrastructure_tab_help_popover';
import { InfraTabs } from './infra_tabs';

export function InfraOverview() {
  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <InfrastructureTabHelpPopover />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiPanel
        color="subdued"
        borderRadius="none"
        hasShadow={false}
        data-test-subj="apmInfrastructureTabPanel"
      >
        <InfraTabs />
      </EuiPanel>
    </>
  );
}
