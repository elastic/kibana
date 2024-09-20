/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUnchangingComparator, initializeTitles } from '@kbn/presentation-publishing';
import { noop } from 'lodash';
import { apiPublishesSettings } from '@kbn/presentation-containers';
import { LENS_EMBEDDABLE_TYPE } from '../../../common/constants';
import { buildObservableVariable } from '../helper';
import type { LensComponentProps, LensRuntimeState } from '../types';
import { apiHasLensComponentProps } from '../renderer/type_guards';

export function initializePanelSettings(state: LensRuntimeState, parentApi: unknown) {
  const title = initializeTitles(state);
  const [defaultPanelTitle$] = buildObservableVariable<string | undefined>(state.title);

  return {
    api: {
      getTypeDisplayName: () => LENS_EMBEDDABLE_TYPE,
      defaultPanelTitle: defaultPanelTitle$,
      ...title.titlesApi,
    },
    comparators: {
      ...title.titleComparators,
      id: getUnchangingComparator<LensRuntimeState, 'id'>(),
      style: getUnchangingComparator<LensRuntimeState, 'style'>(),
      className: getUnchangingComparator<LensRuntimeState, 'className'>(),
      noPadding: getUnchangingComparator<LensRuntimeState, 'noPadding'>(),
      palette: getUnchangingComparator<LensRuntimeState, 'palette'>(),
      viewMode: getUnchangingComparator<LensRuntimeState, 'viewMode'>(),
      renderMode: getUnchangingComparator<LensRuntimeState, 'viewMode'>(),
      executionContext: getUnchangingComparator<LensRuntimeState, 'executionContext'>(),
      syncColors: getUnchangingComparator<LensRuntimeState, 'syncColors'>(),
      syncCursor: getUnchangingComparator<LensRuntimeState, 'syncCursor'>(),
      syncTooltips: getUnchangingComparator<LensRuntimeState, 'syncTooltips'>(),
    },
    serialize: () => {
      const { style, noPadding, className, viewMode } = apiHasLensComponentProps(parentApi)
        ? parentApi
        : ({} as LensComponentProps);
      const settings = apiPublishesSettings(parentApi)
        ? {
            syncColors: parentApi.settings.syncColors$.getValue(),
            syncCursor: parentApi.settings.syncCursor$.getValue(),
            syncTooltips: parentApi.settings.syncTooltips$.getValue(),
          }
        : {};
      return { ...title.serializeTitles(), style, noPadding, className, viewMode, ...settings };
    },
    cleanup: noop,
  };
}
