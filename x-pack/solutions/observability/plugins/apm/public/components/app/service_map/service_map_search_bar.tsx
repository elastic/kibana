/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { buildEsQuery, isPhraseFilter, getPhraseFilterValue, isPhrasesFilter } from '@kbn/es-query';
import { useKibanaQuerySettings } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ApmPluginStartDeps } from '../../../plugin';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { SearchBar } from '../../shared/search_bar/search_bar';
import { TimeComparison } from '../../shared/time_comparison';
import { useAdHocApmDataView } from '../../../hooks/use_adhoc_apm_data_view';
import { fromQuery, toQuery } from '../../shared/links/url_helpers';
import { ServiceMapControls } from './service_map_controls';
import { SERVICE_MAP_CONTROLS_CONFIG } from './service_map_control_panels_config';
import { useServiceMapSearchContext } from './service_map_search_context';
import { useFilterUrlSync } from './use_filter_url_sync';
import { useServiceName } from '../../../hooks/use_service_name';

/**
 * Unified search bar for service map pages.
 *
 * - Renders the APM KQL search bar (time comparison + filter pills, no env dropdown)
 *   followed by Controls API dropdown filters.
 * - Subscribes to filterManager so filter-bar pill changes are captured.
 * - Initialises the Controls environment dropdown from the `environment` URL param.
 * - Writes the environment back to the URL when the user changes it via Controls,
 *   keeping the URL bookmarkable.
 * - Builds a single ES query via `buildEsQuery` and stores it in
 *   ServiceMapSearchContext so `useServiceMap` can send it to the server.
 */
export function ServiceMapSearchBar() {
  const {
    query: { rangeFrom, rangeTo, kuery, environment },
  } = useAnyOfApmParams(
    '/service-map',
    '/services/{serviceName}/service-map',
    '/mobile-services/{serviceName}/service-map'
  );

  const { dataView } = useAdHocApmDataView();
  const kibanaQuerySettings = useKibanaQuerySettings();
  const { setEsQuery } = useServiceMapSearchContext();
  const { services } = useKibana<ApmPluginStartDeps>();
  const { filterManager } = services.data.query;
  const location = useLocation();
  const history = useHistory();
  const serviceName = useServiceName();

  const controlsConfig = useMemo(
    () =>
      serviceName
        ? SERVICE_MAP_CONTROLS_CONFIG.filter((c) => c.field_name !== 'service.name')
        : SERVICE_MAP_CONTROLS_CONFIG,
    [serviceName]
  );

  // Persist filter-bar pills and control selections in the URL (_a) so they survive refresh.
  const { persistControlSelections, getRestoredControlSelections } = useFilterUrlSync();

  // Mirror filterManager state so filter-bar pill changes trigger a re-render.
  const [filterBarFilters, setFilterBarFilters] = useState<Filter[]>(() =>
    filterManager.getFilters()
  );

  // Controls API selections — set by onFiltersChange.
  const [panelFilters, setPanelFilters] = useState<Filter[]>([]);

  // Guard: only sync env back to URL after Controls have fired at least once
  // (prevents overwriting the initial URL env with ENVIRONMENT_ALL on mount).
  const hasControlsFired = useRef(false);

  // Keep filterBarFilters in sync with Kibana's filterManager.
  useEffect(() => {
    const sub = filterManager.getUpdates$().subscribe(() => {
      setFilterBarFilters(filterManager.getFilters());
    });
    return () => sub.unsubscribe();
  }, [filterManager]);

  // When Controls fire, record that they have and update panel filters.
  const handlePanelFiltersChange = useCallback((filters: Filter[]) => {
    hasControlsFired.current = true;
    setPanelFilters(filters);
  }, []);

  // Extract selected values from each control filter by field name.
  const extractSelectionsFromFilters = useCallback((filters: Filter[]): Record<string, string[]> => {
    const selections: Record<string, string[]> = {};
    for (const f of filters) {
      const key = f.meta?.key;
      if (!key || f.meta?.disabled || f.meta?.negate) continue;
      if (isPhraseFilter(f)) {
        selections[key] = [String(getPhraseFilterValue(f))];
      } else if (isPhrasesFilter(f)) {
        selections[key] = f.meta.params.map(String);
      }
    }
    return selections;
  }, []);

  // Extract the environment selected in Controls from panelFilters.
  const envFromControls = useMemo(() => {
    const envFilter = panelFilters.find(
      (f) => f.meta?.key === 'service.environment' && !f.meta?.disabled && !f.meta?.negate
    );
    if (!envFilter) return ENVIRONMENT_ALL.value;

    if (isPhraseFilter(envFilter)) {
      return String(getPhraseFilterValue(envFilter));
    }
    if (isPhrasesFilter(envFilter)) {
      const params = envFilter.meta.params;
      if (params.length === 1) return String(params[0]);
    }
    return ENVIRONMENT_ALL.value;
  }, [panelFilters]);

  // Persist control selections to _a.controlSelections whenever they change.
  useEffect(() => {
    if (!hasControlsFired.current) return;
    const selections = extractSelectionsFromFilters(panelFilters);
    persistControlSelections(selections);
  }, [panelFilters, extractSelectionsFromFilters, persistControlSelections]);

  // Write environment back to the dedicated URL param.
  useEffect(() => {
    if (!hasControlsFired.current) return;
    const existing = toQuery(location.search);
    if (existing.environment === envFromControls) return;
    history.replace({
      ...location,
      search: fromQuery({ ...existing, environment: envFromControls }),
    });
  // location.search as the dep (not the object) to avoid infinite loops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envFromControls, history, location.search]);

  // Rebuild esQuery whenever any input changes.
  useEffect(() => {
    if (!dataView) return;
    const esQuery = buildEsQuery(
      dataView,
      [{ query: kuery, language: 'kuery' }],
      [...filterBarFilters, ...panelFilters],
      kibanaQuerySettings
    );
    setEsQuery(esQuery as Parameters<typeof setEsQuery>[0]);
  }, [dataView, kuery, filterBarFilters, panelFilters, kibanaQuerySettings, setEsQuery]);

  // Seed the Controls dropdowns from the URL on mount.
  // Environment falls back to the dedicated `?environment=` URL param.
  // Other controls restore from `_a.controlSelections`.
  const initialSelections = useMemo(
    () => {
      const restored = getRestoredControlSelections() ?? {};
      return {
        ...restored,
        'service.environment':
          restored['service.environment'] ??
          (environment !== ENVIRONMENT_ALL.value ? [environment] : []),
      };
    },
    // Only computed once — Controls are not re-initialised when the URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <>
      <SearchBar showFilterBar />
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" wrap>
        <EuiFlexItem grow={false}>
          <TimeComparison compressed />
        </EuiFlexItem>
        {dataView && (
          <EuiFlexItem grow>
            <ServiceMapControls
              dataView={dataView}
              timeRange={{ from: rangeFrom, to: rangeTo }}
              filters={[]}
              query={{ query: kuery, language: 'kuery' }}
              onFiltersChange={handlePanelFiltersChange}
              initialSelections={initialSelections}
              controlsConfig={controlsConfig}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
}
