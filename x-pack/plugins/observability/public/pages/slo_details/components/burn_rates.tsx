/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { GetSLOBurnRatesResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import {
  EuiSpacer,
  EuiFlexGrid,
  EuiPanel,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBetaBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetchSloBurnRates } from '../../../hooks/slo/use_fetch_slo_burn_rates';
import { BurnRateWindow, BurnRateWindowParams } from './burn_rate_window';

interface Props {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing?: boolean;
}

const CRITICAL_LONG = 'CRITICAL_LONG';
const CRITICAL_SHORT = 'CRITICAL_SHORT';
const HIGH_LONG = 'HIGH_LONG';
const HIGH_SHORT = 'HIGH_SHORT';
const MEDIUM_LONG = 'MEDIUM_LONG';
const MEDIUM_SHORT = 'MEDIUM_SHORT';
const LOW_LONG = 'LOW_LONG';
const LOW_SHORT = 'LOW_SHORT';

const WINDOWS = [
  { name: CRITICAL_LONG, duration: '1h' },
  { name: CRITICAL_SHORT, duration: '5m' },
  { name: HIGH_LONG, duration: '6h' },
  { name: HIGH_SHORT, duration: '30m' },
  { name: MEDIUM_LONG, duration: '24h' },
  { name: MEDIUM_SHORT, duration: '120m' },
  { name: LOW_LONG, duration: '72h' },
  { name: LOW_SHORT, duration: '360m' },
];

function getSliAndBurnRate(name: string, burnRates: GetSLOBurnRatesResponse['burnRates']) {
  const data = burnRates.find((rate) => rate.name === name);
  if (!data) {
    return { burnRate: null, sli: null };
  }
  return { burnRate: data.burnRate, sli: data.sli };
}

export function BurnRates({ slo, isAutoRefreshing }: Props) {
  const { isLoading, data } = useFetchSloBurnRates({
    slo,
    shouldRefetch: isAutoRefreshing,
    windows: WINDOWS,
  });

  const criticalWindowParams: BurnRateWindowParams = {
    title: i18n.translate('xpack.observability.slo.burnRate.criticalTitle', {
      defaultMessage: 'Critical burn rate',
    }),
    target: 14.4,
    longWindow: {
      label: i18n.translate('xpack.observability.slo.burnRate.criticalLongLabel', {
        defaultMessage: '1 hour',
      }),
      ...getSliAndBurnRate(CRITICAL_LONG, data?.burnRates ?? []),
    },
    shortWindow: {
      label: i18n.translate('xpack.observability.slo.burnRate.criticalShortLabel', {
        defaultMessage: '5 minute',
      }),
      ...getSliAndBurnRate(CRITICAL_SHORT, data?.burnRates ?? []),
    },
  };

  const highWindowParams: BurnRateWindowParams = {
    title: i18n.translate('xpack.observability.slo.burnRate.highTitle', {
      defaultMessage: 'High burn rate',
    }),
    target: 6,
    longWindow: {
      label: i18n.translate('xpack.observability.slo.burnRate.highLongLabel', {
        defaultMessage: '6 hour',
      }),
      ...getSliAndBurnRate(HIGH_LONG, data?.burnRates ?? []),
    },
    shortWindow: {
      label: i18n.translate('xpack.observability.slo.burnRate.highShortLabel', {
        defaultMessage: '30 minute',
      }),
      ...getSliAndBurnRate(HIGH_SHORT, data?.burnRates ?? []),
    },
  };

  const mediumWindowParams: BurnRateWindowParams = {
    title: i18n.translate('xpack.observability.slo.burnRate.mediumTitle', {
      defaultMessage: 'Medium burn rate',
    }),
    target: 3,
    longWindow: {
      label: i18n.translate('xpack.observability.slo.burnRate.mediumLongLabel', {
        defaultMessage: '24 hours',
      }),
      ...getSliAndBurnRate(MEDIUM_LONG, data?.burnRates ?? []),
    },
    shortWindow: {
      label: i18n.translate('xpack.observability.slo.burnRate.mediumShortLabel', {
        defaultMessage: '2 hours',
      }),
      ...getSliAndBurnRate(MEDIUM_SHORT, data?.burnRates ?? []),
    },
  };

  const lowWindowParams: BurnRateWindowParams = {
    title: i18n.translate('xpack.observability.slo.burnRate.lowTitle', {
      defaultMessage: 'Low burn rate',
    }),
    target: 1,
    longWindow: {
      label: i18n.translate('xpack.observability.slo.burnRate.lowLongLabel', {
        defaultMessage: '3 days',
      }),
      ...getSliAndBurnRate(LOW_LONG, data?.burnRates ?? []),
    },
    shortWindow: {
      label: i18n.translate('xpack.observability.slo.burnRate.lowShortLabel', {
        defaultMessage: '6 hours',
      }),
      ...getSliAndBurnRate(LOW_SHORT, data?.burnRates ?? []),
    },
  };

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="burnRatePanel">
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.observability.slo.burnRate.title', {
                defaultMessage: 'Burn rate windows',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <EuiBetaBadge
            label={i18n.translate('xpack.observability.slo.burnRate.technicalPreviewBadgeTitle', {
              defaultMessage: 'Technical Preview',
            })}
            size="s"
            tooltipPosition="bottom"
            tooltipContent={i18n.translate(
              'xpack.observability.slo.burnRate.technicalPreviewBadgeDescription',
              {
                defaultMessage:
                  'This functionality is in technical preview and is subject to change or may be removed in future versions. The design and code is less mature than official generally available features and is being provided as-is with no warranties. Technical preview features are not subject to the support service level agreement of official generally available features.',
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGrid columns={4}>
        <BurnRateWindow {...criticalWindowParams} isLoading={isLoading} />
        <BurnRateWindow {...highWindowParams} isLoading={isLoading} />
        <BurnRateWindow {...mediumWindowParams} isLoading={isLoading} />
        <BurnRateWindow {...lowWindowParams} isLoading={isLoading} />
      </EuiFlexGrid>
    </EuiPanel>
  );
}
