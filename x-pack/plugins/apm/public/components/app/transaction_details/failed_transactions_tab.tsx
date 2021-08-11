/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import {
  METRIC_TYPE,
  useTrackMetric,
} from '../../../../../observability/public';

import { isActivePlatinumLicense } from '../../../../common/license_check';

import { useLicenseContext } from '../../../context/license/use_license_context';

import { LicensePrompt } from '../../shared/license_prompt';

import { ErrorCorrelations } from '../correlations/error_correlations';

import type { TabContentProps } from './types';

function FailedTransactionsTab({}: TabContentProps) {
  const license = useLicenseContext();

  const hasActivePlatinumLicense = isActivePlatinumLicense(license);

  const metric = {
    app: 'apm' as const,
    metric: hasActivePlatinumLicense
      ? 'failed_transactions_tab_view'
      : 'failed_transactions_license_prompt',
    metricType: METRIC_TYPE.COUNT as METRIC_TYPE.COUNT,
  };
  useTrackMetric(metric);
  useTrackMetric({ ...metric, delay: 15000 });

  return hasActivePlatinumLicense ? (
    <ErrorCorrelations />
  ) : (
    <LicensePrompt
      text={i18n.translate('xpack.apm.failedTransactions.licenseCheckText', {
        defaultMessage: `To use failedTransactions, you must be subscribed to an Elastic Platinum license.`,
      })}
    />
  );
}

export const failedTransactionsTab = {
  key: 'failedTransactions',
  label: i18n.translate(
    'xpack.apm.transactionDetails.tabs.failedTransactionsLabel',
    {
      defaultMessage: 'Failing transactions',
    }
  ),
  component: FailedTransactionsTab,
};
