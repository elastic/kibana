/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { isActivePlatinumLicense } from '../../../../common/license_check';

import { useLicenseContext } from '../../../context/license/use_license_context';

import { LicensePrompt } from '../../shared/license_prompt';

import { MlLatencyCorrelations } from '../correlations/ml_latency_correlations_page';

import type { TabContentProps } from './types';

function LatencyCorrelationsTab({}: TabContentProps) {
  const license = useLicenseContext();

  return isActivePlatinumLicense(license) ? (
    <MlLatencyCorrelations correlationAnalysisEnabled={true} />
  ) : (
    <LicensePrompt
      text={i18n.translate('xpack.apm.latencyCorrelations.licenseCheckText', {
        defaultMessage: `To use latency correlations, you must be subscribed to an Elastic Platinum license. With it, you'll be able to discover which fields are correlated with poor performance.`,
      })}
    />
  );
}

export const latencyCorrelationsTab = {
  key: 'latencyCorrelations',
  label: i18n.translate('xpack.apm.transactionDetails.tabs.latencyLabel', {
    defaultMessage: 'Latency correlations analysis',
  }),
  component: LatencyCorrelationsTab,
};
