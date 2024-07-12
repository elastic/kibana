/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { canTrackContentfulRender } from '@kbn/presentation-containers';
import { TableInspectorAdapter } from '../../editor_frame_service/types';

import { getExecutionContextEvents, trackUiCounterEvents } from '../../lens_ui_telemetry';
import { GetStateType, LensApi, LensEmbeddableStartServices } from '../types';

function trackContentfulRender(activeData: TableInspectorAdapter, parentApi: unknown) {
  if (!activeData || !canTrackContentfulRender(parentApi)) {
    return;
  }

  const hasData = Object.values(activeData).some((table) => {
    if (table.meta?.statistics?.totalCount != null) {
      // if totalCount is set, refer to total count
      return table.meta.statistics.totalCount > 0;
    }
    // if not, fall back to check the rows of the table
    return table.rows.length > 0;
  });

  if (hasData) {
    parentApi.trackContentfulRender();
  }
}

export function prepareOnRender(
  api: LensApi,
  parentApi: unknown,
  getState: GetStateType,
  { datasourceMap, visualizationMap }: LensEmbeddableStartServices,
  executionContext: KibanaExecutionContext | undefined,
  dispatchRenderComplete: () => void
) {
  return function onRender$() {
    let datasourceEvents: string[] = [];
    let visualizationEvents: string[] = [];
    const currentState = getState();

    if (currentState) {
      datasourceEvents = Object.values(datasourceMap).reduce<string[]>(
        (acc, datasource) => [
          ...acc,
          ...(datasource.getRenderEventCounters?.(
            currentState.attributes.state.datasourceStates[datasource.id]
          ) ?? []),
        ],
        []
      );

      if (currentState.attributes.visualizationType) {
        visualizationEvents =
          visualizationMap[currentState.attributes.visualizationType].getRenderEventCounters?.(
            currentState.attributes.state.visualization
          ) ?? [];
      }
    }

    const events = [
      ...datasourceEvents,
      ...visualizationEvents,
      ...getExecutionContextEvents(executionContext),
    ];

    const adHocDataViews = Object.values(currentState.attributes.state.adHocDataViews || {});
    adHocDataViews.forEach(() => {
      events.push('ad_hoc_data_view');
    });

    trackUiCounterEvents(events, executionContext);

    trackContentfulRender(api.getInspectorAdapters().tables?.tables, parentApi);

    dispatchRenderComplete();
  };
}
