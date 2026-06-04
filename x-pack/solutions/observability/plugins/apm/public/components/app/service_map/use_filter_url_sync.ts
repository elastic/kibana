/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useState, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import type { Filter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import { decode as decodeRison } from '@kbn/rison';
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

function getRestoredAppFilters(initialState: AppFilterState | null): Filter[] {
  if (!initialState?.filters || initialState.filters.length === 0) {
    return [];
  }

  return initialState.filters.map((f) => ({
    ...f,
    $state: { store: FilterStateStore.APP_STATE },
  }));
}

/**
 * Reads `_a` from the raw browser URL on initial load.
 * This is needed because the APM typed router strips unknown query params
 * (via deepExactRt) before React components mount — so kbnUrlStateStorage
 * won't find `_a` in history.location.search.
 */
function readInitialAppStateFromRawUrl(): AppFilterState | null {
  try {
    const raw = window.location.href;
    const match = raw.match(/[?&]_a=([^&#]+)/);
    if (!match) return null;
    const decoded = decodeURIComponent(match[1]);
    return decodeRison(decoded) as AppFilterState;
  } catch {
    return null;
  }
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

  const [storage] = useState<IKbnUrlStateStorage>(() =>
    createKbnUrlStateStorage({
      useHash: false,
      history,
      ...withNotifyOnErrors(toasts),
    })
  );

  const [initialState] = useState<AppFilterState | null>(() => {
    const state = storage.get<AppFilterState>(APP_STATE_KEY);
    return state ?? readInitialAppStateFromRawUrl();
  });

  const initialAppFilters = useMemo(() => getRestoredAppFilters(initialState), [initialState]);

  useEffect(() => {
    const kbnUrlStateStorage = storage;

    filterManager.setAppFilters(initialAppFilters);

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
  }, [filterManager, initialAppFilters, storage]);

  const persistControlSelections = useCallback(
    (selections: ControlSelections) => {
      const currentUrlState = storage.get<AppFilterState>(APP_STATE_KEY) ?? {};

      const nonEmpty = Object.fromEntries(
        Object.entries(selections).filter(([, v]) => v.length > 0)
      );

      storage.set<AppFilterState>(
        APP_STATE_KEY,
        {
          ...currentUrlState,
          controlSelections: Object.keys(nonEmpty).length > 0 ? nonEmpty : undefined,
        },
        { replace: true }
      );
    },
    [storage]
  );

  const getRestoredControlSelections = useCallback((): ControlSelections | undefined => {
    return initialState?.controlSelections ?? undefined;
  }, [initialState]);

  return { initialAppFilters, persistControlSelections, getRestoredControlSelections };
}
