/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EuiBetaBadge } from '@elastic/eui';

import {
  METRIC_TYPE,
  useTrackMetric,
} from '../../../../../observability/public';

import { isActivePlatinumLicense } from '../../../../common/license_check';

import { useLicenseContext } from '../../../context/license/use_license_context';

import { LicensePrompt } from '../../shared/license_prompt';

import { ErrorCorrelations } from '../correlations/error_correlations';

import type { TabContentProps } from './types';

function FailedTransactionsCorrelationsTab({}: TabContentProps) {
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
      text={i18n.translate(
        'xpack.apm.failedTransactionsCorrelations.licenseCheckText',
        {
          defaultMessage: `To use the failed transactions correlations feature, you must be subscribed to an Elastic Platinum license.`,
        }
      )}
    />
  );
}

export const failedTransactionsCorrelationsTab = {
  dataTestSubj: 'apmFailedTransactionsCorrelationsTabButton',
  key: 'failedTransactionsCorrelations',
  label: (
    <>
      {i18n.translate(
        'xpack.apm.transactionDetails.tabs.failedTransactionsCorrelationsLabel',
        {
          defaultMessage: 'Failed transaction correlations',
        }
      )}{' '}
      <EuiBetaBadge
        label={i18n.translate(
          'xpack.apm.transactionDetails.tabs.failedTransactionsCorrelationsBetaLabel',
          {
            defaultMessage: 'Beta',
          }
        )}
        title={i18n.translate(
          'xpack.apm.transactionDetails.tabs.failedTransactionsCorrelationsBetaTitle',
          {
            defaultMessage: 'Failed transaction rate',
          }
        )}
        tooltipContent={i18n.translate(
          'xpack.apm.transactionDetails.tabs.failedTransactionsCorrelationsBetaDescription',
          {
            defaultMessage:
              'Failed transaction rate is not GA. Please help us by reporting any bugs.',
          }
        )}
        size="s"
      />
    </>
  ),
  component: FailedTransactionsCorrelationsTab,
};
