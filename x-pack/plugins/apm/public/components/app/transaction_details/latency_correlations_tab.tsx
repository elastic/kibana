/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { METRIC_TYPE, useTrackMetric } from '@kbn/observability-plugin/public';

import { isActivePlatinumLicense } from '../../../../common/license_check';

import { useLicenseContext } from '../../../context/license/use_license_context';

import { LicensePrompt } from '../../shared/license_prompt';

import { LatencyCorrelations } from '../correlations/latency_correlations';

import type { TabContentProps } from './types';

function LatencyCorrelationsTab({ onFilter }: TabContentProps) {
  const license = useLicenseContext();

  const hasActivePlatinumLicense = isActivePlatinumLicense(license);

  const metric = {
    app: 'apm' as const,
    metric: hasActivePlatinumLicense
      ? 'correlations_tab_view'
      : 'correlations_license_prompt',
    metricType: METRIC_TYPE.COUNT as METRIC_TYPE.COUNT,
  };
  useTrackMetric(metric);
  useTrackMetric({ ...metric, delay: 15000 });

  return hasActivePlatinumLicense ? (
    <LatencyCorrelations onFilter={onFilter} />
  ) : (
    <LicensePrompt
      text={i18n.translate('xpack.apm.latencyCorrelations.licenseCheckText', {
        defaultMessage: `To use latency correlations, you must be subscribed to an Elastic Platinum license. With it, you'll be able to discover which fields are correlated with poor performance.`,
      })}
    />
  );
}

export const latencyCorrelationsTab = {
  dataTestSubj: 'apmLatencyCorrelationsTabButton',
  key: 'latencyCorrelations',
  label: i18n.translate('xpack.apm.transactionDetails.tabs.latencyLabel', {
    defaultMessage: 'Latency correlations',
  }),
  component: LatencyCorrelationsTab,
};
