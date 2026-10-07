/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { useAnomaliesBadgeDescriptor } from '../../../app/service_inventory/service_list/anomalies_badge';
import { useServiceFlyoutContext } from '../service_flyout_context';
import { getAlertsBadgeDescriptor } from '../../badge/alerts_badge';
import { getSloStatusBadgeDescriptor } from '../../slo_status_badge';
import { SERVICE_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { useServiceBadgesData } from '../hooks/use_service_badges_data';
import { useServiceFlyoutLinks } from '../hooks/use_service_flyout_links';

const { Badge } = FlyoutTemplate.Header;

const SERVICE_BADGE_LABEL = i18n.translate('xpack.apm.serviceFlyout.serviceBadgeLabel', {
  defaultMessage: 'Service',
});

/**
 * Resolves the service flyout header badges (service, alerts, SLO, anomaly) as `Header.Badge`
 * elements for the `FlyoutTemplate.Header` zone. A hook so it can run the badge data/link hooks and
 * `useAnomaliesBadgeDescriptor`; the returned elements must be authored as direct children of the
 * header zone (the template assembly only recognizes parts that are direct children).
 *
 * Alerts, SLO status, and anomaly score are fetched on open and shown once resolved. SLO status uses
 * its own endpoint since SLO summaries are evaluated over the SLO's own window, not the flyout range.
 */
export function useServiceBadges(): ReactElement[] {
  const {
    deps: { core, share },
    service,
    capabilities: flyoutCapabilities,
    filters: { environment, rangeFrom, rangeTo, transactionType },
  } = useServiceFlyoutContext();
  const { navigateToUrl } = core.application;
  const showDynamicBadges = flyoutCapabilities.header?.badges ?? false;

  const { slos: slosHref } = useServiceFlyoutLinks();

  const { alertsCount, anomalyData, sloData } = useServiceBadgesData({
    serviceName: service.name,
    environment,
    rangeFrom,
    rangeTo,
  });

  const anomalyDescriptor = useAnomaliesBadgeDescriptor({
    score: anomalyData?.anomalyScore,
    detectorType: anomalyData?.detectorType,
    navigationProps:
      anomalyData && service.agentName && anomalyData.anomalyEnvironment && share?.url?.locators
        ? {
            serviceName: service.name,
            anomalyEnvironment: anomalyData.anomalyEnvironment,
            agentName: service.agentName,
            rangeFrom,
            rangeTo,
            locators: share.url.locators,
            transactionType,
          }
        : undefined,
    ebt: {
      action: EBT_CLICK_ACTIONS.VIEW_ANOMALIES,
      element: SERVICE_FLYOUT_EBT_ELEMENTS.ANOMALIES_BADGE,
    },
  });

  const badges: ReactElement[] = [
    <Badge
      key="service"
      id="service"
      color="default"
      iconType="grid"
      data-test-subj="serviceFlyoutServiceBadge"
    >
      {SERVICE_BADGE_LABEL}
    </Badge>,
  ];

  if (showDynamicBadges && alertsCount !== undefined) {
    const descriptor = getAlertsBadgeDescriptor({
      count: alertsCount,
      serviceName: service.name,
      'data-test-subj': 'serviceFlyoutAlertsBadge',
      ebt: {
        action: EBT_CLICK_ACTIONS.VIEW_ALERTS,
        element: SERVICE_FLYOUT_EBT_ELEMENTS.ALERTS_BADGE,
      },
      navigationProps:
        service.agentName && share?.url?.locators
          ? {
              serviceName: service.name,
              agentName: service.agentName,
              environment,
              rangeFrom,
              rangeTo,
              locators: share.url.locators,
            }
          : undefined,
    });

    badges.push(
      descriptor.href ? (
        <Badge
          key="alerts"
          id="alerts"
          color={descriptor.color}
          iconType={descriptor.iconType}
          data-test-subj={descriptor['data-test-subj']}
          toolTipContent={descriptor.toolTipContent}
          toolTipPosition="bottom"
          href={descriptor.href}
          aria-label={descriptor.ariaLabel}
          {...descriptor.ebtProps}
        >
          {descriptor.label}
        </Badge>
      ) : (
        <Badge
          key="alerts"
          id="alerts"
          color={descriptor.color}
          iconType={descriptor.iconType}
          data-test-subj={descriptor['data-test-subj']}
          toolTipContent={descriptor.toolTipContent}
          toolTipPosition="bottom"
          role="img"
          aria-label={descriptor.ariaLabel}
        >
          {descriptor.label}
        </Badge>
      )
    );
  }

  if (showDynamicBadges && sloData !== undefined) {
    const descriptor = getSloStatusBadgeDescriptor({
      sloStatus: sloData.sloStatus,
      sloCount: sloData.sloCount,
      serviceName: service.name,
    });

    badges.push(
      slosHref ? (
        <Badge
          key="slo"
          id="slo"
          color={descriptor.color}
          data-test-subj="serviceFlyoutSloBadge"
          data-slo-status={sloData.sloStatus}
          toolTipContent={descriptor.toolTipContent}
          toolTipPosition="bottom"
          onClick={(event) => {
            event.preventDefault();
            navigateToUrl(slosHref);
          }}
          onClickAriaLabel={descriptor.ariaLabel}
          {...getEbtProps({
            action: EBT_CLICK_ACTIONS.VIEW_SLOS,
            element: SERVICE_FLYOUT_EBT_ELEMENTS.SLO_BADGE,
          })}
        >
          {descriptor.label}
        </Badge>
      ) : (
        <Badge
          key="slo"
          id="slo"
          color={descriptor.color}
          data-test-subj="serviceFlyoutSloBadge"
          data-slo-status={sloData.sloStatus}
          toolTipContent={descriptor.toolTipContent}
          toolTipPosition="bottom"
          role="img"
          aria-label={descriptor.ariaLabel}
        >
          {descriptor.label}
        </Badge>
      )
    );
  }

  if (showDynamicBadges && anomalyData !== undefined) {
    badges.push(
      anomalyDescriptor.href ? (
        <Badge
          key="anomaly"
          id="anomaly"
          color={anomalyDescriptor.color}
          data-test-subj="serviceFlyoutAnomaliesBadge"
          toolTipContent={anomalyDescriptor.toolTipContent}
          toolTipPosition="bottom"
          href={anomalyDescriptor.href}
          aria-label={anomalyDescriptor.ariaLabel}
          {...anomalyDescriptor.ebtProps}
        >
          {anomalyDescriptor.label}
        </Badge>
      ) : (
        <Badge
          key="anomaly"
          id="anomaly"
          color={anomalyDescriptor.color}
          data-test-subj="serviceFlyoutAnomaliesBadge"
          toolTipContent={anomalyDescriptor.toolTipContent}
          toolTipPosition="bottom"
          role="img"
          aria-label={anomalyDescriptor.ariaLabel}
        >
          {anomalyDescriptor.label}
        </Badge>
      )
    );
  }

  return badges;
}
