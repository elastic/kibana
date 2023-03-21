/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { asCost } from '../../utils/formatters/as_cost';
import { asDuration } from '../../utils/formatters/as_duration';
import { asNumber } from '../../utils/formatters/as_number';
import { asPercentage } from '../../utils/formatters/as_percentage';
import { asWeight } from '../../utils/formatters/as_weight';

const ANNUAL_SECONDS = 60 * 60 * 24 * 365;

// The assumed amortized per-core average power consumption.
const PER_CORE_WATT = 40;

// The assumed CO2 emissions per KWH (sourced from www.eia.gov)
const CO2_PER_KWH = 0.92;

// The cost of a CPU core per hour, in dollars
const CORE_COST_PER_HOUR = 0.0425;

export function getImpactRows({
  countInclusive,
  countExclusive,
  totalSamples,
  totalSeconds,
}: {
  countInclusive: number;
  countExclusive: number;
  totalSamples: number;
  totalSeconds: number;
}) {
  const percentage = countInclusive / totalSamples;
  const percentageNoChildren = countExclusive / totalSamples;
  const totalCoreSeconds = totalSamples / 20;
  const coreSeconds = totalCoreSeconds * percentage;
  const coreSecondsNoChildren = totalCoreSeconds * percentageNoChildren;
  const coreHours = coreSeconds / (60 * 60);
  const coreHoursNoChildren = coreSecondsNoChildren / (60 * 60);
  const annualizedScaleUp = ANNUAL_SECONDS / totalSeconds;
  const co2 = ((PER_CORE_WATT * coreHours) / 1000.0) * CO2_PER_KWH;
  const co2NoChildren = ((PER_CORE_WATT * coreHoursNoChildren) / 1000.0) * CO2_PER_KWH;
  const annualizedCo2 = co2 * annualizedScaleUp;
  const annualizedCo2NoChildren = co2NoChildren * annualizedScaleUp;
  const dollarCost = coreHours * CORE_COST_PER_HOUR;
  const dollarCostNoChildren = coreHoursNoChildren * CORE_COST_PER_HOUR;

  const impactRows = [
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.percentageCpuTimeInclusiveLabel',
        {
          defaultMessage: '% of CPU time',
        }
      ),
      value: asPercentage(percentage),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.percentageCpuTimeExclusiveLabel',
        {
          defaultMessage: '% of CPU time (excl. children)',
        }
      ),
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
        {
          defaultMessage: 'Core-seconds',
        }
      ),
      value: asDuration(coreSeconds),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.coreSecondsExclusiveLabel',
        {
          defaultMessage: 'Core-seconds (excl. children)',
        }
      ),
      value: asDuration(coreSecondsNoChildren),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedCoreSecondsInclusiveLabel',
        {
          defaultMessage: 'Annualized core-seconds',
        }
      ),
      value: asDuration(coreSeconds * annualizedScaleUp),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedCoreSecondsExclusiveLabel',
        {
          defaultMessage: 'Annualized core-seconds (excl. children)',
        }
      ),
      value: asDuration(coreSecondsNoChildren * annualizedScaleUp),
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
        {
          defaultMessage: 'CO2 emission (excl. children)',
        }
      ),
      value: asWeight(co2NoChildren),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedCo2InclusiveLabel',
        {
          defaultMessage: 'Annualized CO2',
        }
      ),
      value: asWeight(annualizedCo2),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedCo2ExclusiveLabel',
        {
          defaultMessage: 'Annualized CO2 (excl. children)',
        }
      ),
      value: asWeight(annualizedCo2NoChildren),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.dollarCostInclusiveLabel',
        {
          defaultMessage: 'Dollar cost',
        }
      ),
      value: asCost(dollarCost),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.dollarCostExclusiveLabel',
        {
          defaultMessage: 'Dollar cost (excl. children)',
        }
      ),
      value: asCost(dollarCostNoChildren),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedDollarCostInclusiveLabel',
        {
          defaultMessage: 'Annualized dollar cost',
        }
      ),
      value: asCost(dollarCost * annualizedScaleUp),
    },
    {
      label: i18n.translate(
        'xpack.profiling.flameGraphInformationWindow.annualizedDollarCostExclusiveLabel',
        {
          defaultMessage: 'Annualized dollar cost (excl. children)',
        }
      ),
      value: asCost(dollarCostNoChildren * annualizedScaleUp),
    },
  ];

  return impactRows;
}
