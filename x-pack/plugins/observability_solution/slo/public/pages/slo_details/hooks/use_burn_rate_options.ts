/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { BurnRateOption } from '../../../components/slo/burn_rate/burn_rates';
import { useFetchRulesForSlo } from '../../../hooks/use_fetch_rules_for_slo';

export const DEFAULT_BURN_RATE_OPTIONS: BurnRateOption[] = [
  {
    id: htmlIdGenerator()(),
    label: i18n.translate('xpack.slo.burnRates.fromRange.label', {
      defaultMessage: '{duration} hour',
      values: { duration: 1 },
    }),
    ariaLabel: i18n.translate('xpack.slo.burnRates.fromRange.label', {
      defaultMessage: '{duration} hour',
      values: { duration: 1 },
    }),
    windowName: 'CRITICAL',
    threshold: 14.4,
    duration: 1,
  },
  {
    id: htmlIdGenerator()(),
    label: i18n.translate('xpack.slo.burnRates.fromRange.label', {
      defaultMessage: '{duration} hours',
      values: { duration: 6 },
    }),
    ariaLabel: i18n.translate('xpack.slo.burnRates.fromRange.label', {
      defaultMessage: '{duration} hours',
      values: { duration: 6 },
    }),
    windowName: 'HIGH',
    threshold: 6,
    duration: 6,
  },
  {
    id: htmlIdGenerator()(),
    label: i18n.translate('xpack.slo.burnRates.fromRange.label', {
      defaultMessage: '{duration} hours',
      values: { duration: 24 },
    }),
    ariaLabel: i18n.translate('xpack.slo.burnRates.fromRange.label', {
      defaultMessage: '{duration} hours',
      values: { duration: 24 },
    }),
    windowName: 'MEDIUM',
    threshold: 3,
    duration: 24,
  },
  {
    id: htmlIdGenerator()(),
    ariaLabel: i18n.translate('xpack.slo.burnRates.fromRange.label', {
      defaultMessage: '{duration} hours',
      values: { duration: 72 },
    }),
    label: i18n.translate('xpack.slo.burnRates.fromRange.label', {
      defaultMessage: '{duration} hours',
      values: { duration: 72 },
    }),
    windowName: 'LOW',
    threshold: 1,
    duration: 72,
  },
];

export const useBurnRateOptions = (slo: SLOWithSummaryResponse) => {
  const { data: rules } = useFetchRulesForSlo({ sloIds: [slo.id] });
  const burnRateOptions =
    rules?.[slo.id]?.[0]?.params?.windows?.map((window) => ({
      id: htmlIdGenerator()(),
      label: i18n.translate('xpack.slo.burnRates.fromRange.label', {
        defaultMessage: '{duration, plural, one {# hour} other {# hours}}',
        values: { duration: window.longWindow.value },
      }),
      ariaLabel: i18n.translate('xpack.slo.burnRates.fromRange.label', {
        defaultMessage: '{duration, plural, one {# hour} other {# hours}}',
        values: { duration: window.longWindow.value },
      }),
      windowName: window.actionGroup,
      threshold: window.burnRateThreshold,
      duration: window.longWindow.value,
    })) ?? DEFAULT_BURN_RATE_OPTIONS;

  return { burnRateOptions };
};
