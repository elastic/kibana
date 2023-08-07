/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { calculateImpactEstimates } from '../../../common/calculate_impact_estimates';
import { asCost } from '../../utils/formatters/as_cost';
import { asDuration } from '../../utils/formatters/as_duration';
import { asNumber } from '../../utils/formatters/as_number';
import { asPercentage } from '../../utils/formatters/as_percentage';
import { asWeight } from '../../utils/formatters/as_weight';
import { CPULabelWithHint } from '../cpu_label_with_hint';

export function getImpactRows({
  countInclusive,
  countExclusive,
  totalSamples,
  totalSeconds,
  isApproximate = false,
}: {
  countInclusive: number;
  countExclusive: number;
  totalSamples: number;
  totalSeconds: number;
  isApproximate: boolean;
}) {
  const {
    percentage,
    percentageNoChildren,
    coreSeconds,
    annualizedCoreSeconds,
    coreSecondsNoChildren,
    co2,
    co2NoChildren,
    annualizedCo2,
    annualizedCo2NoChildren,
    dollarCost,
    dollarCostNoChildren,
    annualizedDollarCost,
    annualizedDollarCostNoChildren,
    annualizedCoreSecondsNoChildren,
  } = calculateImpactEstimates({
    countInclusive,
    countExclusive,
    totalSamples,
    totalSeconds,
  });

  const impactRows = [
    {
      label: <CPULabelWithHint type="total" labelSize="s" iconSize="s" />,
      value: asPercentage(percentage),
    },
    {
      label: <CPULabelWithHint type="self" labelSize="s" iconSize="s" />,
      value: asPercentage(percentageNoChildren),
    },
    {
      label: i18n.translate('xpack.profiling.flameGraphInformationWindow.samplesInclusiveLabel', {
        defaultMessage: 'Samples',
      }),
      value: asNumber(countInclusive),
    },
    {
      label: i18n.translate('xpack.profiling.flameGraphInformationWindow.samplesExclusiveLabel', {
        defaultMessage: 'Samples (excl. children)',
      }),
      value: asNumber(countExclusive),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.coreSecondsInclusiveLabel',
        { defaultMessage: 'Core-seconds' }
      ),
      value: asDuration(coreSeconds),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.coreSecondsExclusiveLabel',
        { defaultMessage: 'Core-seconds (excl. children)' }
      ),
      value: asDuration(coreSecondsNoChildren),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedCoreSecondsInclusiveLabel',
        { defaultMessage: 'Annualized core-seconds' }
      ),
      value: asDuration(annualizedCoreSeconds),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedCoreSecondsExclusiveLabel',
        { defaultMessage: 'Annualized core-seconds (excl. children)' }
      ),
      value: asDuration(annualizedCoreSecondsNoChildren),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.co2EmissionInclusiveLabel',
        {
          defaultMessage: 'CO2 emission',
        }
      ),
      value: asWeight(co2),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.co2EmissionExclusiveLabel',
        { defaultMessage: 'CO2 emission (excl. children)' }
      ),
      value: asWeight(co2NoChildren),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedCo2InclusiveLabel',
        { defaultMessage: 'Annualized CO2' }
      ),
      value: asWeight(annualizedCo2),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedCo2ExclusiveLabel',
        { defaultMessage: 'Annualized CO2 (excl. children)' }
      ),
      value: asWeight(annualizedCo2NoChildren),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.dollarCostInclusiveLabel',
        { defaultMessage: 'Dollar cost' }
      ),
      value: asCost(dollarCost),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.dollarCostExclusiveLabel',
        { defaultMessage: 'Dollar cost (excl. children)' }
      ),
      value: asCost(dollarCostNoChildren),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedDollarCostInclusiveLabel',
        { defaultMessage: 'Annualized dollar cost' }
      ),
      value: asCost(annualizedDollarCost),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedDollarCostExclusiveLabel',
        { defaultMessage: 'Annualized dollar cost (excl. children)' }
      ),
      value: asCost(annualizedDollarCostNoChildren),
    },
  ];

  return impactRows;
}
