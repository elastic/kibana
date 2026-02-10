/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import {
  BooleanRelation,
  buildCombinedFilter,
  buildPhraseFilter,
  isOfAggregateQueryType,
} from '@kbn/es-query';
import { getIndexPatternFromESQLQuery, replaceESQLQueryIndexPattern } from '@kbn/esql-utils';
import type {
  FormBasedPersistedState,
  FormBasedPrivateState,
  TextBasedPersistedState,
  TextBasedPrivateState,
  TypedLensSerializedState,
  XYState,
} from '@kbn/lens-common';
import type { DashboardState } from '@kbn/dashboard-plugin/server';
import type { Reference } from '@kbn/content-management-utils';
import {
  existingDashboardFileNames,
  loadDashboardFile,
  type InfrastructureDashboardType,
} from './dashboards/dashboard_catalog';

export interface DashboardDefinition {
  panels: DashboardState['panels'];
  references: Reference[];
}

export interface InfrastructureDashboardProps {
  dashboardType: InfrastructureDashboardType;
  dataView: DataView;
  serviceName?: string;
  podNames?: string[];
  containerNames?: string[];
  hostNames?: string[];
  timeRange?: { from: string; to: string };
}

export function hasDashboard(dashboardType: InfrastructureDashboardType): boolean {
  return existingDashboardFileNames.has(dashboardType);
}

function isTextBasedPrivateState(
  state: TextBasedPersistedState | undefined
): state is TextBasedPrivateState {
  return !!state && 'indexPatternRefs' in state;
}

function isFormBasedPrivateState(
  state: FormBasedPersistedState | undefined
): state is FormBasedPrivateState {
  return !!state && 'currentIndexPatternId' in state;
}

function isXYVisualization(visualization: unknown): visualization is XYState {
  return (
    typeof visualization === 'object' &&
    visualization !== null &&
    'layers' in visualization &&
    Array.isArray((visualization as { layers: unknown }).layers)
  );
}

function isLensTypedState(state: unknown): state is TypedLensSerializedState {
  if (typeof state !== 'object' || state === null || !('attributes' in state)) {
    return false;
  }
  const { attributes } = state as { attributes: unknown };
  return typeof attributes === 'object' && attributes !== null && 'state' in attributes;
}

/**
 * Replace the FROM source in an ES|QL query with the given index pattern
 * using the ES|QL AST, so no placeholder strings are needed in the query text.
 */
function replaceESQLIndexPattern(esql: string, indexPattern: string): string {
  const currentPattern = getIndexPatternFromESQLQuery(esql);
  if (!currentPattern || currentPattern === indexPattern) {
    return esql;
  }
  return replaceESQLQueryIndexPattern(esql, { [currentPattern]: indexPattern });
}

/**
 * Unconditionally set all data-view-related structural fields
 * (IDs, titles, refs) in a Lens panel config to the real values.
 *
 * The dashboard JSONs contain runtime Lens state (TextBasedPrivateState,
 * FormBasedPrivateState) rather than pure persisted state, which is why
 * the private-state types are used for narrowing.
 */
function injectDataViewIntoConfig(
  config: TypedLensSerializedState,
  indexPattern: string,
  dataViewId: string
): void {
  // ES|QL queries — replace the FROM source at the embeddable and state level
  if (isOfAggregateQueryType(config.query)) {
    config.query.esql = replaceESQLIndexPattern(config.query.esql, indexPattern);
  }

  const state = config.attributes?.state;
  if (!state) return;

  if (isOfAggregateQueryType(state.query)) {
    state.query.esql = replaceESQLIndexPattern(state.query.esql, indexPattern);
  }

  const { datasourceStates } = state;

  // Text-based datasource — layer queries and indexPatternRefs
  if (isTextBasedPrivateState(datasourceStates.textBased)) {
    for (const layer of Object.values(datasourceStates.textBased.layers)) {
      if (isOfAggregateQueryType(layer.query)) {
        layer.query.esql = replaceESQLIndexPattern(layer.query.esql, indexPattern);
      }
    }
    for (const ref of datasourceStates.textBased.indexPatternRefs) {
      ref.id = dataViewId;
      ref.title = indexPattern;
    }
  }

  // Ad-hoc data views
  for (const dv of Object.values(state.adHocDataViews ?? {})) {
    dv.title = indexPattern;
    dv.name = indexPattern;
  }

  // Form-based datasource — layer indexPatternId and currentIndexPatternId
  if (isFormBasedPrivateState(datasourceStates.formBased)) {
    for (const layer of Object.values(datasourceStates.formBased.layers)) {
      layer.indexPatternId = dataViewId;
    }
    datasourceStates.formBased.currentIndexPatternId = dataViewId;
  }

  // XY annotation layers carry their own indexPatternId in state.visualization
  if (isXYVisualization(state.visualization)) {
    for (const layer of state.visualization.layers) {
      if ('indexPatternId' in layer) {
        layer.indexPatternId = dataViewId;
      }
    }
  }
}

/**
 * Walk panels (including sections) and inject data view into each panel config.
 */
function injectDataViewIntoPanels(
  panels: DashboardState['panels'],
  indexPattern: string,
  dataViewId: string
): void {
  if (!panels) return;
  for (const item of panels) {
    if ('panels' in item) {
      const { panels: sectionPanels } = item;
      if (sectionPanels) {
        injectDataViewIntoPanels(sectionPanels, indexPattern, dataViewId);
      }
    } else {
      const { config } = item;
      if (config && isLensTypedState(config)) {
        injectDataViewIntoConfig(config, indexPattern, dataViewId);
      }
    }
  }
}

/**
 * Load a dashboard definition and inject the data view.
 *
 * All data-view-related structural fields (reference IDs, indexPatternId,
 * titles, etc.) are set unconditionally after loading.
 */
export async function loadDashboardDefinition(
  props: InfrastructureDashboardProps
): Promise<DashboardDefinition | undefined> {
  if (!hasDashboard(props.dashboardType)) {
    return undefined;
  }

  const dashboardModule = await loadDashboardFile(props.dashboardType);
  const raw = dashboardModule
    ? 'default' in dashboardModule
      ? dashboardModule.default
      : dashboardModule
    : undefined;

  if (!raw?.panels) {
    return undefined;
  }

  // Deep clone so we don't mutate the imported module
  const { panels, references } = structuredClone(raw);

  const indexPattern = props.dataView.getIndexPattern();
  const dataViewId = props.dataView.id ?? '';

  // Inject into all panel configs
  injectDataViewIntoPanels(panels, indexPattern, dataViewId);

  // Unconditionally set all index-pattern reference IDs
  const updatedReferences = references.map((ref) =>
    ref.type === 'index-pattern' ? { ...ref, id: dataViewId } : ref
  );

  return { panels, references: updatedReferences };
}

/**
 * Build proper Kibana filters for infrastructure filtering.
 * Uses buildCombinedFilter with OR relation for multiple values.
 */
export function buildInfrastructureFilters(props: InfrastructureDashboardProps): Filter[] {
  const { dataView, podNames, containerNames, hostNames } = props;
  const filters: Filter[] = [];

  if (podNames && podNames.length > 0) {
    const podField = dataView.getFieldByName('kubernetes.pod.name');
    if (podField) {
      const podFilters = podNames.map((name) => buildPhraseFilter(podField, name, dataView));
      filters.push(buildCombinedFilter(BooleanRelation.OR, podFilters, dataView));
    }
  }

  if (containerNames && containerNames.length > 0) {
    const containerIdField = dataView.getFieldByName('container.id');
    const containerNameField = dataView.getFieldByName('container.name');

    if (containerIdField) {
      const containerFilters = containerNames.map((name) =>
        buildPhraseFilter(containerIdField, name, dataView)
      );
      filters.push(buildCombinedFilter(BooleanRelation.OR, containerFilters, dataView));
    } else if (containerNameField) {
      const containerFilters = containerNames.map((name) =>
        buildPhraseFilter(containerNameField, name, dataView)
      );
      filters.push(buildCombinedFilter(BooleanRelation.OR, containerFilters, dataView));
    }
  }

  if (hostNames && hostNames.length > 0) {
    const hostField = dataView.getFieldByName('host.name');
    if (hostField) {
      const hostFilters = hostNames.map((name) => buildPhraseFilter(hostField, name, dataView));
      filters.push(buildCombinedFilter(BooleanRelation.OR, hostFilters, dataView));
    }
  }

  return filters;
}
