/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { HostMetricsExplanationContent } from '../../../lens';
import { TitleWithTooltip } from '../../components/section_title';
import { AlertsTooltipContent } from '../../components/alerts_tooltip_content';
import { ServicesTooltipContent } from '../../components/services_tooltip_content';

export const MetricsSectionTitle = () => {
  return (
    <TitleWithTooltip
      title={i18n.translate('xpack.infra.assetDetails.overview.metricsSectionTitle', {
        defaultMessage: 'Metrics',
      })}
      data-test-subj="infraAssetDetailsMetricsTitle"
      tooltipTestSubj="infraAssetDetailsMetricsPopoverButton"
      tooltipContent={<HostMetricsExplanationContent />}
    />
  );
};

export const AlertsSectionTitle = () => {
  return (
    <TitleWithTooltip
      title={i18n.translate('xpack.infra.assetDetails.overview.alertsSectionTitle', {
        defaultMessage: 'Alerts',
      })}
      data-test-subj="infraAssetDetailsAlertsTitle"
      tooltipTestSubj="infraAssetDetailsAlertsPopoverButton"
      tooltipContent={<AlertsTooltipContent />}
    />
  );
};

export const ServicesSectionTitle = () => (
  <TitleWithTooltip
    title={i18n.translate('xpack.infra.assetDetails.overview.servicesSectionTitle', {
      defaultMessage: 'Services',
    })}
    data-test-subj="infraAssetDetailsServicesTitle"
    tooltipTestSubj="infraAssetDetailsServicesPopoverButton"
    tooltipContent={<ServicesTooltipContent />}
  />
);
