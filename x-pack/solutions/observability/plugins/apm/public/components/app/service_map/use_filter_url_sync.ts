/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import type { Filter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { ApmPluginStartDeps } from '../../../plugin';

const APP_STATE_KEY = '_a';

/**
 * Fields managed by dedicated URL params (e.g. `?environment=production`).
 * Filters targeting these fields are excluded from `_a.filters` to avoid
 * double-storage and conflicting state.
 */
const FIELDS_WITH_DEDICATED_URL_PARAMS = new Set(['service.environment']);

export type ControlSelections = Record<string, string[]>;

interface AppFilterState {
  filters?: Filter[];
  controlSelections?: ControlSelections;
}

/**
 * Syncs filter-bar pills (app-state filters) with the URL `_a` query param.
 *
 * APM already manages `kuery`, `rangeFrom`, `rangeTo`, and `environment` via
 * its own URL params so we only sync the Data plugin's `filterManager` app
 * filters here — not time or query.
 *
 * On mount: reads `_a.filters` from the URL and pushes them into filterManager.
 * On filter change: writes filterManager app filters back to `_a.filters`.
 *
 * Also exposes helpers to persist/restore Controls API selections in `_a.controlSelections`.
 */
export function useFilterUrlSync() {
  const history = useHistory();
  const { services } = useKibana<ApmPluginStartDeps>();
  const {
    data: {
      query: { filterManager },
    },
    notifications: { toasts },
  } = services;

  const storageRef = useRef<IKbnUrlStateStorage | null>(null);
  if (!storageRef.current) {
    storageRef.current = createKbnUrlStateStorage({
      useHash: false,
      history,
      ...withNotifyOnErrors(toasts),
    });
  }

  useEffect(() => {
    const kbnUrlStateStorage = storageRef.current!;

    // Restore filters from URL on mount
    const initialState = kbnUrlStateStorage.get<AppFilterState>(APP_STATE_KEY);
    if (initialState?.filters && initialState.filters.length > 0) {
      const restoredFilters = initialState.filters.map((f) => ({
        ...f,
        $state: { store: FilterStateStore.APP_STATE },
      }));
      filterManager.setAppFilters(restoredFilters);
    }

    // Subscribe to filterManager changes and write back to URL
    const sub = filterManager.getUpdates$().subscribe(() => {
      const appFilters = filterManager
        .getAppFilters()
        .filter((f) => !FIELDS_WITH_DEDICATED_URL_PARAMS.has(f.meta?.key ?? ''));

      const currentUrlState = kbnUrlStateStorage.get<AppFilterState>(APP_STATE_KEY) ?? {};

      kbnUrlStateStorage.set<AppFilterState>(
        APP_STATE_KEY,
        { ...currentUrlState, filters: appFilters.length > 0 ? appFilters : undefined },
        { replace: true }
      );
    });

    return () => {
      sub.unsubscribe();
    };
  }, [filterManager, toasts]);

  const persistControlSelections = useCallback((selections: ControlSelections) => {
    if (!storageRef.current) return;
    const currentUrlState = storageRef.current.get<AppFilterState>(APP_STATE_KEY) ?? {};

    const nonEmpty = Object.fromEntries(Object.entries(selections).filter(([, v]) => v.length > 0));

    storageRef.current.set<AppFilterState>(
      APP_STATE_KEY,
      {
        ...currentUrlState,
        controlSelections: Object.keys(nonEmpty).length > 0 ? nonEmpty : undefined,
      },
      { replace: true }
    );
  }, []);

  const getRestoredControlSelections = useCallback((): ControlSelections | undefined => {
    if (!storageRef.current) return undefined;
    const state = storageRef.current.get<AppFilterState>(APP_STATE_KEY);
    return state?.controlSelections;
  }, []);

  return { persistControlSelections, getRestoredControlSelections };
}
