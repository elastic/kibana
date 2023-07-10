/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import React, { memo } from 'react';
import type { CoverageOverviewMitreTechnique } from '../../../rule_management/model/coverage_overview/mitre_technique';

export interface CoverageOverviewMitreTechniquePanelProps {
  technique: CoverageOverviewMitreTechnique;
}

const CoverageOverviewMitreTechniquePanelComponent = ({
  technique,
}: CoverageOverviewMitreTechniquePanelProps) => {
  return (
    <EuiPanel style={{ width: 100, height: 100 }}>
      {technique.name}
      <br />
      <small>{'Enabled: '}</small>
      <small>{technique.enabledRules.length}</small>
      <br />
      <small>{'Disabled: '}</small>
      <small>{technique.disabledRules.length}</small>
    </EuiPanel>
  );
};

export const CoverageOverviewMitreTechniquePanel = memo(
  CoverageOverviewMitreTechniquePanelComponent
);
