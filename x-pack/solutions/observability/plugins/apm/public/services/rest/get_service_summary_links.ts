/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SloListLocatorParams } from '@kbn/deeplinks-observability';
import type { ObservabilityTracesServiceSummaryLinks } from '@kbn/discover-shared-plugin/public';
import { apmRouter } from '../../components/routing/apm_route_config';
import { ENVIRONMENT_ALL_VALUE } from '../../../common/environment_filter_values';
import { getManageSlosUrl } from '../../hooks/use_manage_slos_url';

/** Builds absolute APM hrefs for a service's destinations so consumers never construct APM URLs. */
export const getServiceSummaryLinks = (
  {
    serviceName,
    environment,
    start,
    end,
  }: {
    serviceName: string;
    environment?: string;
    start: string;
    end: string;
  },
  {
    application,
    sloListLocator,
  }: {
    application: ApplicationStart;
    sloListLocator?: LocatorPublic<SloListLocatorParams>;
  }
): ObservabilityTracesServiceSummaryLinks => {
  const query = {
    environment: environment || ENVIRONMENT_ALL_VALUE,
    rangeFrom: start,
    rangeTo: end,
    kuery: '',
    serviceGroup: '',
    comparisonEnabled: false,
  };

  const toHref = (path: string) => application.getUrlForApp('apm', { path });

  return {
    serviceOverview: toHref(
      apmRouter.link('/services/{serviceName}/overview', { path: { serviceName }, query })
    ),
    alerts: toHref(
      apmRouter.link('/services/{serviceName}/alerts', { path: { serviceName }, query })
    ),
    // The SLO list lives in its own app; the locator applies the APM indicator + service filters.
    // Fall back to the SLOs app root if the locator isn't registered (e.g. SLOs disabled).
    slos:
      getManageSlosUrl(sloListLocator, { serviceName, environment }) ??
      application.getUrlForApp('slo'),
  };
};
