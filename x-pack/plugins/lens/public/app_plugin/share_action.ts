/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { SerializableRecord } from '@kbn/utility-types';
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { LensAppLocatorParams } from '../../common/locator/locator';
import type { LensAppState } from '../state_management';
import type { LensAppServices } from './types';
import type { Document } from '../persistence/saved_object_store';
import type { DatasourceMap, VisualizationMap } from '../types';
import { extractReferencesFromState, getResolvedDateRange } from '../utils';
import { getEditPath } from '../../common';

interface ShareableConfiguration
  extends Pick<
    LensAppState,
    'activeDatasourceId' | 'datasourceStates' | 'visualization' | 'filters' | 'query'
  > {
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  currentDoc: Document | undefined;
  adHocDataViews?: DataViewSpec[];
}

function getShareURLForSavedObject(
  { application, data }: Pick<LensAppServices, 'application' | 'data'>,
  currentDoc: Document | undefined
) {
  return new URL(
    `${application.getUrlForApp('lens', { absolute: true })}${
      currentDoc?.savedObjectId
        ? getEditPath(
            currentDoc?.savedObjectId,
            data.query.timefilter.timefilter.getTime(),
            data.query.filterManager.getGlobalFilters(),
            data.query.timefilter.timefilter.getRefreshInterval()
          )
        : ''
    }`
  );
}

function getShortShareableURL(
  shortUrlService: (params: LensAppLocatorParams) => Promise<string>,
  data: LensAppServices['data'],
  {
    filters,
    query,
    activeDatasourceId,
    datasourceStates,
    datasourceMap,
    visualizationMap,
    visualization,
    adHocDataViews,
  }: ShareableConfiguration
) {
  const references = extractReferencesFromState({
    activeDatasources: Object.keys(datasourceStates).reduce(
      (acc, datasourceId) => ({
        ...acc,
        [datasourceId]: datasourceMap[datasourceId],
      }),
      {}
    ),
    datasourceStates,
    visualizationState: visualization.state,
    activeVisualization: visualization.activeId
      ? visualizationMap[visualization.activeId]
      : undefined,
  }) as Array<SavedObjectReference & SerializableRecord>;

  const serializableVisualization = visualization as LensAppState['visualization'] &
    SerializableRecord;

  const serializableDatasourceStates = datasourceStates as LensAppState['datasourceStates'] &
    SerializableRecord;

  return shortUrlService({
    filters,
    query,
    resolvedDateRange: getResolvedDateRange(data.query.timefilter.timefilter),
    visualization: serializableVisualization,
    datasourceStates: serializableDatasourceStates,
    activeDatasourceId,
    searchSessionId: data.search.session.getSessionId(),
    references,
    dataViewSpecs: adHocDataViews,
  });
}

export async function getShareURL(
  shortUrlService: (params: LensAppLocatorParams) => Promise<string>,
  services: Pick<LensAppServices, 'application' | 'data'>,
  configuration: ShareableConfiguration
) {
  return {
    shareableUrl: await getShortShareableURL(shortUrlService, services.data, configuration),
    savedObjectURL: getShareURLForSavedObject(services, configuration.currentDoc),
  };
}
