/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import type { RiskInputs } from '../../../../common/entity_analytics/risk_engine';
import { RiskInputsPanelContent } from './content';

export interface RiskInputsPanelProps extends Record<string, unknown> {
  riskInputs: RiskInputs;
}

export interface RiskInputsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'all-risk-inputs';
  params: RiskInputsPanelProps;
}

export const RiskInputsPanelKey: RiskInputsExpandableFlyoutProps['key'] = 'all-risk-inputs';

export const RiskInputsPanel = ({ riskInputs }: RiskInputsPanelProps) => {
  return <RiskInputsPanelContent riskInputs={riskInputs} />;
};

RiskInputsPanel.displayName = 'RiskInputsPanel';
