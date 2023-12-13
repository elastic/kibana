/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlyout, EuiFlyoutBody } from '@elastic/eui';
import React from 'react';
import { profilingUseLegacyCo2Calculation } from '@kbn/observability-plugin/common';
import { Frame, FrameInformationWindow } from '.';
import { useCalculateImpactEstimate } from '../../hooks/use_calculate_impact_estimates';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { getImpactRows } from './get_impact_rows';
import { EmptyFrame } from './empty_frame';

interface Props {
  frame?: Frame;
  totalSamples: number;
  totalSeconds: number;
  showAIAssistant?: boolean;
  showSymbolsStatus?: boolean;
  onClose: () => void;
}

export function FrameInformationTooltip({
  onClose,
  frame,
  totalSamples,
  totalSeconds,
  showAIAssistant,
  showSymbolsStatus,
}: Props) {
  const calculateImpactEstimates = useCalculateImpactEstimate();
  const {
    start: { core },
  } = useProfilingDependencies();
  const shouldUseLegacyCo2Calculation = core.uiSettings.get<boolean>(
    profilingUseLegacyCo2Calculation
  );

  if (!frame) {
    return <EmptyFrame />;
  }

  const impactRows = getImpactRows({
    countInclusive: frame.countInclusive,
    countExclusive: frame.countExclusive,
    selfAnnualCO2Kgs: frame.selfAnnualCO2Kgs,
    totalAnnualCO2Kgs: frame.totalAnnualCO2Kgs,
    selfAnnualCostUSD: frame.selfAnnualCostUSD,
    totalAnnualCostUSD: frame.totalAnnualCostUSD,
    totalSamples,
    totalSeconds,
    calculateImpactEstimates,
    shouldUseLegacyCo2Calculation,
  });

  return (
    <EuiFlyout onClose={onClose} size="m">
      <EuiFlyoutBody>
        <FrameInformationWindow
          frame={frame}
          impactRows={impactRows}
          showAIAssistant={showAIAssistant}
          showSymbolsStatus={showSymbolsStatus}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
