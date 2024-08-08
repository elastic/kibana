/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuggestionRequest, VisualizationSuggestion } from '@kbn/lens-plugin/public';
import type { FileLayer } from '@elastic/ems-client';
import type { ChoroplethChartState } from './types';

let emsFileLayers: FileLayer[] | undefined;
let getSuggestionsActual:
  | ((
      suggestionRequest: SuggestionRequest<ChoroplethChartState>,
      emsFileLayers: FileLayer[]
    ) => Array<VisualizationSuggestion<ChoroplethChartState>>)
  | undefined;
let promise: undefined | Promise<void>;

/**
 * Avoid loading file layers during plugin setup
 * Instead, load file layers when getSuggestions is called
 * Since getSuggestions is sync, the trade off is that
 * getSuggestions will return no suggestions until file layers load
 */
export function getSuggestionsLazy(
  suggestionRequest: SuggestionRequest<ChoroplethChartState>
): Array<VisualizationSuggestion<ChoroplethChartState>> {
  if (!promise) {
    promise = new Promise((resolve) => {
      Promise.all([import('./suggestions'), import('../../util')])
        .then(async ([{ getSuggestions }, { getEmsFileLayers }]) => {
          getSuggestionsActual = getSuggestions;
          try {
            emsFileLayers = await getEmsFileLayers();
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn(
              `Lens region map is unable to access administrative boundaries from Elastic Maps Service (EMS). To avoid unnecessary EMS requests, set 'map.includeElasticMapsService: false' in 'kibana.yml'.`
            );
          }
          resolve();
        })
        .catch(resolve);
    });
    return [];
  }

  return emsFileLayers && getSuggestionsActual
    ? getSuggestionsActual(suggestionRequest, emsFileLayers)
    : [];
}
