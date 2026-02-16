/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';
import { SloStatusBadge } from '../../../shared/slo_status_badge';
import type { SloStatus } from '../../../../../common/service_inventory';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

const SLO_STATUS_PRIORITY: SloStatus[] = ['violated', 'degrading', 'noData', 'healthy'];

interface ServiceHeaderBadgesProps {
  serviceName: string;
  environment: string;
  start: string;
  end: string;
  onSloClick: () => void;
  alertsTabHref: string;
}

export function ServiceHeaderBadges({
  serviceName,
  environment,
  start,
  end,
  onSloClick,
  alertsTabHref,
}: ServiceHeaderBadgesProps) {
  const { core, plugins } = useApmPluginContext();
  const { capabilities } = core.application;
  const { isAlertingAvailable, canReadAlerts } = getAlertingCapabilities(plugins, capabilities);
  const canReadSlos = !!capabilities.slo?.read;

  const { data: alertsData } = useFetcher(
    (callApmApi) => {
      if (!(isAlertingAvailable && canReadAlerts)) {
        return;
      }
      return callApmApi('GET /internal/apm/services/{serviceName}/alerts_count', {
        params: {
          path: { serviceName },
          query: { start, end, environment },
        },
      });
    },
    [serviceName, start, end, environment, isAlertingAvailable, canReadAlerts]
  );

  const { data: sloData, status } = useFetcher(
    (callApmApi) => {
      if (!canReadSlos) {
        return;
      }
      return callApmApi('GET /internal/apm/services/{serviceName}/slos', {
        params: {
          path: { serviceName },
          query: {
            environment,
            page: 0,
            perPage: 1,
          },
        },
      });
    },
    [serviceName, environment, canReadSlos]
  );

  const alertsCount = alertsData?.alertsCount ?? 0;

  const sloStatus = useMemo<{ status: SloStatus | 'noSLOs'; count: number }>(() => {
    const statusCounts = sloData?.statusCounts;
    const totalSlos = sloData?.total ?? 0;

    if (totalSlos > 0 && statusCounts) {
      for (const priority of SLO_STATUS_PRIORITY) {
        const count = statusCounts[priority] ?? 0;
        if (count > 0) {
          return { status: priority, count };
        }
      }
    }

    return { status: 'noSLOs', count: 0 };
  }, [sloData?.statusCounts, sloData?.total]);

  const showAlertsBadge = isAlertingAvailable && canReadAlerts && alertsCount > 0;
  const showSloBadge = canReadSlos && status === FETCH_STATUS.SUCCESS;

  if (!showAlertsBadge && !showSloBadge) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {showAlertsBadge && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="bottom"
            content={i18n.translate('xpack.apm.serviceHeader.alertsBadge.tooltip', {
              defaultMessage:
                '{count, plural, one {# active alert} other {# active alerts}}. Click to view.',
              values: { count: alertsCount },
            })}
          >
            <EuiBadge
              data-test-subj="serviceHeaderAlertsBadge"
              color="danger"
              iconType="warning"
              href={alertsTabHref}
            >
              {alertsCount}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {showSloBadge && (
        <EuiFlexItem grow={false}>
          <SloStatusBadge
            sloStatus={sloStatus.status}
            sloCount={sloStatus.count}
            serviceName={serviceName}
            onClick={onSloClick}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
