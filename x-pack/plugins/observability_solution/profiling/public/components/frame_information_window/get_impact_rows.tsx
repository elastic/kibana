/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  ANNUAL_SECONDS,
  CalculateImpactEstimates,
} from '../../hooks/use_calculate_impact_estimates';
import { asCost } from '../../utils/formatters/as_cost';
import { asDuration } from '../../utils/formatters/as_duration';
import { asNumber } from '../../utils/formatters/as_number';
import { asPercentage } from '../../utils/formatters/as_percentage';
import { asWeight } from '../../utils/formatters/as_weight';
import { CPULabelWithHint } from '../cpu_label_with_hint';

interface Params {
  countInclusive: number;
  countExclusive: number;
  totalSamples: number;
  totalSeconds: number;
  calculateImpactEstimates: CalculateImpactEstimates;
  selfAnnualCO2Kgs: number;
  totalAnnualCO2Kgs: number;
  selfAnnualCostUSD: number;
  totalAnnualCostUSD: number;
  rank?: number;
}

export interface ImpactRow {
  'data-test-subj': string;
  label: React.ReactNode;
  value: string;
}

const getComparisonValue = <T,>(value: T, comparisonValue?: T) =>
  comparisonValue ? `${value} vs ${comparisonValue}` : value;

/**
 * e.g.:
 * label: 'foo',
 * value: 'abc' vs 'xyz'
 */
export function getComparisonImpactRow({
  base,
  comparison,
}: {
  base: Params;
  comparison?: Params;
}) {
  const baseImpactRows = getImpactRows(base);
  const comparisonImpactRows = comparison ? getImpactRows(comparison) : [];
  return [
    ...(base.rank
      ? [
          {
            'data-test-subj': 'rank',
            label: i18n.translate('xpack.profiling.flameGraphInformationWindow.rank', {
              defaultMessage: 'Rank',
            }),
            value: getComparisonValue(base.rank, comparison?.rank),
          },
        ]
      : []),
    ...baseImpactRows.map((baseItem, index) => {
      const comparisonValue = comparisonImpactRows[index]?.value;
      return {
        ...baseItem,
        value: getComparisonValue(baseItem.value, comparisonValue),
      };
    }),
  ];
}

export function getImpactRows({
  countInclusive,
  countExclusive,
  totalSamples,
  totalSeconds,
  calculateImpactEstimates,
  selfAnnualCO2Kgs,
  totalAnnualCO2Kgs,
  selfAnnualCostUSD,
  totalAnnualCostUSD,
}: Params): ImpactRow[] {
  const { selfCPU, totalCPU } = calculateImpactEstimates({
    countInclusive,
    countExclusive,
    totalSamples,
    totalSeconds,
  });

  const annualSecondsRatio = ANNUAL_SECONDS / totalSeconds;

  return [
    {
      'data-test-subj': 'totalCPU',
      label: <CPULabelWithHint type="total" labelSize="s" iconSize="s" />,
      value: asPercentage(totalCPU.percentage),
    },
    {
      'data-test-subj': 'selfCPU',
      label: <CPULabelWithHint type="self" labelSize="s" iconSize="s" />,
      value: asPercentage(selfCPU.percentage),
    },
    {
      'data-test-subj': 'samples',
      label: i18n.translate('xpack.profiling.flameGraphInformationWindow.samplesInclusiveLabel', {
        defaultMessage: 'Samples',
      }),
      value: asNumber(countInclusive),
    },
    {
      'data-test-subj': 'selfSamples',
      label: i18n.translate('xpack.profiling.flameGraphInformationWindow.samplesExclusiveLabel', {
        defaultMessage: 'Samples (excl. children)',
      }),
      value: asNumber(countExclusive),
    },
    {
      'data-test-subj': 'coreSeconds',
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.coreSecondsInclusiveLabel',
        { defaultMessage: 'Core-seconds' }
      ),
      value: asDuration(totalCPU.coreSeconds),
    },
    {
      'data-test-subj': 'selfCoreSeconds',
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.coreSecondsExclusiveLabel',
        { defaultMessage: 'Core-seconds (excl. children)' }
      ),
      value: asDuration(selfCPU.coreSeconds),
    },
    {
      'data-test-subj': 'annualizedCoreSeconds',
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedCoreSecondsInclusiveLabel',
        { defaultMessage: 'Annualized core-seconds' }
      ),
      value: asDuration(totalCPU.annualizedCoreSeconds),
    },
    {
      'data-test-subj': 'annualizedSelfCoreSeconds',
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedCoreSecondsExclusiveLabel',
        { defaultMessage: 'Annualized core-seconds (excl. children)' }
      ),
      value: asDuration(selfCPU.annualizedCoreSeconds),
    },
    {
      'data-test-subj': 'co2Emission',
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.co2EmissionInclusiveLabel',
        {
          defaultMessage: 'CO2 emission',
        }
      ),
      value: asWeight(totalAnnualCO2Kgs / annualSecondsRatio, 'kgs'),
    },
    {
      'data-test-subj': 'selfCo2Emission',
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.co2EmissionExclusiveLabel',
        { defaultMessage: 'CO2 emission (excl. children)' }
      ),
      value: asWeight(selfAnnualCO2Kgs / annualSecondsRatio, 'kgs'),
    },
    {
      'data-test-subj': 'annualizedCo2Emission',
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedCo2InclusiveLabel',
        { defaultMessage: 'Annualized CO2' }
      ),
      value: asWeight(totalAnnualCO2Kgs, 'kgs'),
    },
    {
      'data-test-subj': 'annualizedSelfCo2Emission',
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedCo2ExclusiveLabel',
        { defaultMessage: 'Annualized CO2 (excl. children)' }
      ),
      value: asWeight(selfAnnualCO2Kgs, 'kgs'),
    },
    {
      'data-test-subj': 'dollarCost',
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.dollarCostInclusiveLabel',
        { defaultMessage: 'Dollar cost' }
      ),
      value: asCost(totalAnnualCostUSD / annualSecondsRatio),
    },
    {
      'data-test-subj': 'selfDollarCost',
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.dollarCostExclusiveLabel',
        { defaultMessage: 'Dollar cost (excl. children)' }
      ),
      value: asCost(selfAnnualCostUSD / annualSecondsRatio),
    },
    {
      'data-test-subj': 'annualizedDollarCost',
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedDollarCostInclusiveLabel',
        { defaultMessage: 'Annualized dollar cost' }
      ),
      value: asCost(totalAnnualCostUSD),
    },
    {
      'data-test-subj': 'annualizedSelfDollarCost',
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedDollarCostExclusiveLabel',
        { defaultMessage: 'Annualized dollar cost (excl. children)' }
      ),
      value: asCost(selfAnnualCostUSD),
    },
  ];
}
