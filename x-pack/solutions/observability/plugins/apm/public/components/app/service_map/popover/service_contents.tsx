/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import {
  EuiButton,
  EuiFlexItem,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiSpacer,
  EuiBadge,
  EuiToolTip,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { NodeDataDefinition } from 'cytoscape';
import { ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import type { ContentsProps } from '.';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { AnomalyDetection } from './anomaly_detection';
import { StatsList } from './stats_list';
import { useTimeRange } from '../../../../hooks/use_time_range';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { SloStatusBadge } from '../../../shared/slo_status_badge';
import type { ServiceHealthStatus } from '../../../../../common/service_health_status';
import type { SloStatus } from '../../../../../common/service_inventory';

type ServiceNodeReturn = APIReturnType<'GET /internal/apm/service-map/service/{serviceName}'>;

const INITIAL_STATE: ServiceNodeReturn = {
  currentPeriod: {},
  previousPeriod: undefined,
};

export function ServiceContents({ onFocusClick, elementData, environment, kuery }: ContentsProps) {
  const nodeData = elementData as NodeDataDefinition;
  const apmRouter = useApmRouter();

  const { query } = useAnyOfApmParams(
    '/service-map',
    '/services/{serviceName}/service-map',
    '/mobile-services/{serviceName}/service-map'
  );

  if (!('rangeFrom' in query && 'rangeTo' in query) || !query.rangeFrom || !query.rangeTo) {
    throw new Error('Expected rangeFrom and rangeTo to be set');
  }

  const { rangeFrom, rangeTo, comparisonEnabled, offset } = query;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const serviceName = nodeData.id!;
  const serviceGroup = ('serviceGroup' in query && query.serviceGroup) || '';

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi('GET /internal/apm/service-map/service/{serviceName}', {
          params: {
            path: { serviceName },
            query: {
              environment,
              start,
              end,
              offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
            },
          },
        });
      }
    },
    [environment, serviceName, start, end, offset, comparisonEnabled]
  );

  const isLoading = status === FETCH_STATUS.LOADING;

  const detailsUrl = apmRouter.link('/services/{serviceName}', {
    path: { serviceName },
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery,
      comparisonEnabled,
      serviceGroup,
    },
  });

  const focusUrl = apmRouter.link('/services/{serviceName}/service-map', {
    path: { serviceName },
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery,
      serviceGroup,
      comparisonEnabled,
    },
  });

  const { serviceAnomalyStats } = nodeData;

  const combinedHealthStatus = nodeData.combinedHealthStatus as ServiceHealthStatus | undefined;
  const alertsCount = nodeData.alertsCount as number | undefined;
  const sloStatus = nodeData.sloStatus as SloStatus | undefined;
  const sloCount = nodeData.sloCount as number | undefined;

  return (
    <>
      <EuiFlexItem>
        {/* Alerts Badge */}
        {alertsCount !== undefined && alertsCount > 0 && (
          <>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  position="bottom"
                  content={i18n.translate('xpack.apm.serviceMap.popover.activeAlertsExplanation', {
                    defaultMessage: 'Active alerts',
                  })}
                >
                  <EuiBadge
                    data-test-subj="serviceMapPopoverAlertsBadgeLink"
                    iconType="warning"
                    color="danger"
                    href={apmRouter.link('/services/{serviceName}/alerts', {
                      path: { serviceName },
                      query: {
                        rangeFrom,
                        rangeTo,
                        environment,
                        kuery,
                        comparisonEnabled,
                        serviceGroup,
                        alertStatus: ALERT_STATUS_ACTIVE,
                      },
                    })}
                  >
                    {alertsCount}
                  </EuiBadge>
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  {i18n.translate('xpack.apm.serviceMap.popover.activeAlerts', {
                    defaultMessage: '{count, plural, one {# active alert} other {# active alerts}}',
                    values: { count: alertsCount },
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        )}

        {/* SLO Badge */}
        {sloStatus && sloCount !== undefined && sloCount > 0 && (
          <>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <SloStatusBadge
                  sloStatus={sloStatus}
                  sloCount={sloCount}
                  serviceName={serviceName}
                  onClick={() => {
                    // // Navigate to service details page (SLOs are shown there)
                    // window.location.href = apmRouter.link('/services/{serviceName}', {
                    //   path: { serviceName },
                    //   query: {
                    //     rangeFrom,
                    //     rangeTo,
                    //     environment,
                    //     kuery,
                    //     comparisonEnabled,
                    //     serviceGroup,
                    //   },
                    // });
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  {i18n.translate('xpack.apm.serviceMap.popover.sloStatus', {
                    defaultMessage: '{count, plural, one {# SLO} other {# SLOs}}',
                    values: { count: sloCount },
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        )}

        {(combinedHealthStatus ||
          (alertsCount && alertsCount > 0) ||
          (sloCount && sloCount > 0)) && <EuiHorizontalRule margin="xs" />}

        {serviceAnomalyStats && (
          <>
            <AnomalyDetection serviceName={serviceName} serviceAnomalyStats={serviceAnomalyStats} />
            <EuiHorizontalRule margin="xs" />
          </>
        )}
        <StatsList data={data} isLoading={isLoading} />
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <EuiButton
          data-test-subj="apmServiceContentsServiceDetailsButton"
          href={detailsUrl}
          fill={true}
        >
          {i18n.translate('xpack.apm.serviceMap.serviceDetailsButtonText', {
            defaultMessage: 'Service Details',
          })}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton
          data-test-subj="apmServiceContentsFocusMapButton"
          color="success"
          href={focusUrl}
          onClick={onFocusClick}
        >
          {i18n.translate('xpack.apm.serviceMap.focusMapButtonText', {
            defaultMessage: 'Focus map',
          })}
        </EuiButton>
      </EuiFlexItem>
    </>
  );
}
