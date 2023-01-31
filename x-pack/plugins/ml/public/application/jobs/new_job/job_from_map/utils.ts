/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Query } from '@kbn/es-query';
import type { MapEmbeddable } from '@kbn/maps-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { ML_PAGES, ML_APP_LOCATOR } from '../../../../../common/constants/locator';

export async function redirectToGeoJobWizard(
  embeddable: MapEmbeddable,
  dataViewId: string,
  geoField: string,
  layerQuery: Query | null,
  splitField: string | null,
  share: SharePluginStart
) {
  const { query, filters, to, from } = await getJobsItemsFromEmbeddable(embeddable);
  const embeddableQuery = await embeddable.getQuery();
  const embeddableFilters = await embeddable.getFilters();
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

export function isCompatibleMapVisualization(embeddable: MapEmbeddable) {
  return embeddable.getLayerList().some((layer) => {
    const geoField = layer.getGeoFieldNames().length ? layer.getGeoFieldNames()[0] : undefined;
    const dataViewId = layer.getIndexPatternIds().length
      ? layer.getIndexPatternIds()[0]
      : undefined;
    return geoField && dataViewId;
  });
}

export async function getJobsItemsFromEmbeddable(embeddable: MapEmbeddable) {
  // Get dashboard level query/filters
  const { filters, timeRange, ...input } = embeddable.getInput();
  const query = input.query === undefined ? { query: '', language: 'kuery' } : input.query;

  if (timeRange === undefined) {
    throw Error(
      i18n.translate('xpack.ml.newJob.fromGeo.createJob.error.noTimeRange', {
        defaultMessage: 'Time range not specified.',
      })
    );
  }
  const { to, from } = timeRange;
  const dashboard = embeddable.parent?.type === 'dashboard' ? embeddable.parent : undefined;

  return {
    from,
    to,
    query,
    filters,
    dashboard,
  };
}
