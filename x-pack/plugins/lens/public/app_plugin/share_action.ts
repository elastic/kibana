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
import type { LensDocument } from '../persistence/saved_object_store';
import type { DatasourceMap, VisualizationMap } from '../types';
import { extractReferencesFromState, getResolvedDateRange } from '../utils';
import { getEditPath } from '../../common/constants';

interface ShareableConfiguration
  extends Pick<
    LensAppState,
    'activeDatasourceId' | 'datasourceStates' | 'visualization' | 'filters' | 'query'
  > {
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  currentDoc: LensDocument | undefined;
  adHocDataViews?: DataViewSpec[];
}

// This approximate Lens workspace dimensions ratio on a typical widescreen
export const DEFAULT_LENS_LAYOUT_DIMENSIONS = {
  width: 1793,
  // this is a magic number from the reporting tool implementation
  // see: x-pack/plugins/screenshotting/server/browsers/chromium/driver_factory/index.ts#L146
  height: 1086,
};

function getShareURLForSavedObject(
  { application, data }: Pick<LensAppServices, 'application' | 'data'>,
  currentDoc: LensDocument | undefined
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

export function getLocatorParams(
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
    currentDoc,
  }: ShareableConfiguration,
  isDirty: boolean
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

  const snapshotParams: LensAppLocatorParams = {
    filters,
    query,
    resolvedDateRange: getResolvedDateRange(data.query.timefilter.timefilter),
    visualization: serializableVisualization,
    datasourceStates: serializableDatasourceStates,
    activeDatasourceId,
    searchSessionId: data.search.session.getSessionId(),
    references,
    dataViewSpecs: adHocDataViews,
  };

  return {
    shareURL: snapshotParams,
    // for reporting use the shorten version when available
    reporting:
      currentDoc?.savedObjectId && !isDirty
        ? {
            filters,
            query,
            resolvedDateRange: getResolvedDateRange(data.query.timefilter.timefilter),
            savedObjectId: currentDoc?.savedObjectId,
          }
        : snapshotParams,
  };
}

export async function getShareURL(
  shortUrlService: (params: LensAppLocatorParams) => Promise<string>,
  services: Pick<LensAppServices, 'application' | 'data'>,
  configuration: ShareableConfiguration,
  shareUrlEnabled: boolean,
  isDirty: boolean
) {
  const { shareURL: locatorParams, reporting: reportingLocatorParams } = getLocatorParams(
    services.data,
    configuration,
    isDirty
  );
  return {
    shareableUrl: await (shareUrlEnabled ? shortUrlService(locatorParams) : undefined),
    savedObjectURL: getShareURLForSavedObject(services, configuration.currentDoc),
    reportingLocatorParams,
  };
}
