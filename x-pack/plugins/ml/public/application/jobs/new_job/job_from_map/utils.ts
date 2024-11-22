/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Query } from '@kbn/es-query';
import { apiIsOfType } from '@kbn/presentation-publishing';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { MapApi } from '@kbn/maps-plugin/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { ML_PAGES, ML_APP_LOCATOR } from '../../../../../common/constants/locator';

export async function redirectToGeoJobWizard(
  embeddable: MapApi,
  dataViewId: string,
  geoField: string,
  layerQuery: Query | null,
  splitField: string | null,
  share: SharePluginStart
) {
  const { query, filters, to, from } = await getJobsItemsFromEmbeddable(embeddable);
  const embeddableQuery = embeddable.query$?.value;
  const embeddableFilters = embeddable.filters$?.value ?? [];
  const locator = share.url.locators.get(ML_APP_LOCATOR);

  const pageState = {
    dashboard: { query, filters },
    dataViewId,
    embeddable: { query: embeddableQuery, filters: embeddableFilters },
    geoField,
    splitField,
    from,
    to,
    ...(layerQuery ? { layer: { query: layerQuery } } : {}),
  };

  const url = await locator?.getUrl({
    page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_MAP,
    pageState,
  });

  window.open(url, '_blank');
}

export function isCompatibleMapVisualization(api: MapApi) {
  return api.getLayerList().some((layer) => {
    return layer.getGeoFieldNames().length && layer.getIndexPatternIds().length;
  });
}

export async function getJobsItemsFromEmbeddable(embeddable: MapApi) {
  const dashboardApi = apiIsOfType(embeddable.parentApi, 'dashboard')
    ? (embeddable.parentApi as DashboardApi)
    : undefined;
  const timeRange = embeddable.timeRange$?.value ?? dashboardApi?.timeRange$?.value;
  if (timeRange === undefined) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromGeo.createJob.error.noTimeRange', {
        defaultMessage: 'Time range not specified.',
      })
    );
  }
  return {
    from: timeRange.from,
    to: timeRange.to,
    query: (dashboardApi?.query$?.value as Query) ?? { query: '', language: 'kuery' },
    filters: dashboardApi?.filters$?.value ?? [],
    dashboard: dashboardApi,
  };
}
