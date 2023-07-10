/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import React, { memo } from 'react';
import type { CoverageOverviewMitreTactic } from '../../../rule_management/model/coverage_overview/mitre_tactic';

export interface CoverageOverviewTacticPanelProps {
  tactic: CoverageOverviewMitreTactic;
}

const CoverageOverviewTacticPanelComponent = ({ tactic }: CoverageOverviewTacticPanelProps) => {
  return (
    <EuiPanel style={{ width: 100, height: 100, background: 'grey' }}>
      {tactic.name}
      <br />
      <small>{'Enabled: '}</small>
      <small>{tactic.enabledRules.length}</small>
      <br />
      <small>{'Disabled: '}</small>
      <small>{tactic.disabledRules.length}</small>
    </EuiPanel>
  );
};

export const CoverageOverviewTacticPanel = memo(CoverageOverviewTacticPanelComponent);
