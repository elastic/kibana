/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Simplify } from '@kbn/chart-expressions-common';
import type {
  BrushTriggerEvent,
  ClickTriggerEvent,
  MultiClickTriggerEvent,
} from '@kbn/charts-plugin/public';
import { inferTimeField } from '@kbn/lens-plugin/public';
import type { CustomizationCallback } from '@kbn/discover-plugin/public';
import type { UnifiedHistogramContainerProps } from '@kbn/unified-histogram-plugin/public';
import { ACTION_GLOBAL_APPLY_FILTER } from '@kbn/unified-search-plugin/public';
import { useCallback } from 'react';
import { DiscoverInTimelineTrigger } from '../../../../../actions/constants';
import { useKibana } from '../../../../../common/lib/kibana';

interface PreventableEvent {
  preventDefault(): void;
}

export const useHistogramCustomization = () => {
  const {
    services: { customDataService: discoverDataService, uiActions },
  } = useKibana();

  const onFilterCallback: UnifiedHistogramContainerProps['onFilter'] = useCallback(
    async (
      e: Simplify<(ClickTriggerEvent['data'] | MultiClickTriggerEvent['data']) & PreventableEvent>
    ) => {
      if (e.preventDefault) e.preventDefault();
      let filters = Array.isArray(e.data)
        ? await discoverDataService.actions.createFiltersFromValueClickAction({
            data: e.data,
            negate: e.negate ?? false,
          })
        : await discoverDataService.actions.createFiltersFromMultiValueClickAction({
            data: e.data,
            negate: e.negate,
          });

      if (filters && !Array.isArray(filters)) {
        filters = [filters];
      }
      if (filters && filters.length > 0) {
        const applyFilterTrigger = uiActions.getTrigger(
          DiscoverInTimelineTrigger.HISTOGRAM_TRIGGER
        );

        await applyFilterTrigger.exec({
          filters,
          timeFieldName:
            e.timeFieldName || inferTimeField(discoverDataService.datatableUtilities, e),
        });
      }
    },
    [uiActions, discoverDataService.actions, discoverDataService.datatableUtilities]
  );
  const onBrushEndCallback: UnifiedHistogramContainerProps['onBrushEnd'] = useCallback(
    (
      data: BrushTriggerEvent['data'] & {
        preventDefault: () => void;
      }
    ) => {
      discoverDataService.query.timefilter.timefilter.setTime({
        from: new Date(data.range[0]).toISOString(),
        to: new Date(data.range[1]).toISOString(),
        mode: 'absolute',
      });
      if (data.preventDefault) data.preventDefault();
    },
    [discoverDataService.query.timefilter.timefilter]
  );

  const setHistogramCustomizationCallback: CustomizationCallback = useCallback(
    ({ customizations }) => {
      customizations.set({
        id: 'unified_histogram',
        onFilter: onFilterCallback,
        onBrushEnd: onBrushEndCallback,
        withDefaultActions: false,
        disabledActions: [ACTION_GLOBAL_APPLY_FILTER],
      });
    },
    [onFilterCallback, onBrushEndCallback]
  );

  return setHistogramCustomizationCallback;
};
