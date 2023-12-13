/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutBody } from '@elastic/eui';
import { profilingUseLegacyCo2Calculation } from '@kbn/observability-plugin/common';
import React from 'react';
import { Frame, FrameInformationWindow } from '.';
import { useCalculateImpactEstimate } from '../../hooks/use_calculate_impact_estimates';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { EmptyFrame } from './empty_frame';
import { getComparisonImpactRow } from './get_impact_rows';

interface Props {
  comparisonFrame?: Frame;
  comparisonTotalSeconds: number;
  comparisonTotalSamples: number;
  comparisonRank?: number;
  rank: number;
  frame?: Frame;
  showAIAssistant?: boolean;
  showSymbolsStatus?: boolean;
  totalSamples: number;
  totalSeconds: number;
  onClose: () => void;
}

export function ComparisonFrameInformationTooltip({
  frame,
  totalSamples,
  totalSeconds,
  comparisonTotalSeconds,
  comparisonFrame,
  comparisonTotalSamples,
  onClose,
  showAIAssistant,
  showSymbolsStatus,
  rank,
  comparisonRank,
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

  const impactRows = getComparisonImpactRow({
    base: {
      countInclusive: frame.countInclusive,
      countExclusive: frame.countExclusive,
      selfAnnualCO2Kgs: frame.selfAnnualCO2Kgs,
      totalAnnualCO2Kgs: frame.totalAnnualCO2Kgs,
      selfAnnualCostUSD: frame.selfAnnualCostUSD,
      totalAnnualCostUSD: frame.totalAnnualCostUSD,
      rank,
      totalSamples,
      totalSeconds,
      calculateImpactEstimates,
      shouldUseLegacyCo2Calculation,
    },
    comparison: comparisonFrame
      ? {
          countInclusive: comparisonFrame.countInclusive,
          countExclusive: comparisonFrame.countExclusive,
          selfAnnualCO2Kgs: comparisonFrame.selfAnnualCO2Kgs,
          totalAnnualCO2Kgs: comparisonFrame.totalAnnualCO2Kgs,
          selfAnnualCostUSD: comparisonFrame.selfAnnualCostUSD,
          totalAnnualCostUSD: comparisonFrame.totalAnnualCostUSD,
          rank: comparisonRank,
          totalSamples: comparisonTotalSamples,
          totalSeconds: comparisonTotalSeconds,
          calculateImpactEstimates,
          shouldUseLegacyCo2Calculation,
        }
      : undefined,
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
