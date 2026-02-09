/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { get } from 'lodash';
import type { AggregateQuery, Filter } from '@kbn/es-query';
import { BooleanRelation, buildCombinedFilter, buildPhraseFilter } from '@kbn/es-query';
import type { TextBasedLayer } from '@kbn/lens-common';
import type {
  DashboardPanel,
  DashboardSection,
  DashboardState,
} from '@kbn/dashboard-plugin/server';
import type { Reference } from '@kbn/content-management-utils';
import {
  existingDashboardFileNames,
  loadDashboardFile,
  type InfrastructureDashboardType,
} from './dashboards/dashboard_catalog';

/**
 * Placeholder used in the dashboard JSON POJOs for the index pattern.
 * All occurrences are replaced with the actual index pattern at load time.
 */
const INDEX_PATTERN_PLACEHOLDER = '{{indexPattern}}';

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

/**
 * Replace placeholder index pattern in a single ES|QL query string.
 */
function replaceEsqlPlaceholder(esql: string, indexPattern: string): string {
  return esql.replaceAll(INDEX_PATTERN_PLACEHOLDER, indexPattern);
}

/**
 * Inject the real index pattern and data view ID into a single Lens panel config.
 * Each location where the placeholder can appear is handled explicitly.
 */
function injectDataViewIntoConfig(
  config: Record<string, unknown>,
  indexPattern: string,
  dataViewId: string
): void {
  // 1. Top-level embeddable query (config.query.esql)
  const query = config.query as AggregateQuery | undefined;
  if (query?.esql) {
    query.esql = replaceEsqlPlaceholder(query.esql, indexPattern);
  }

  const state = get(config, 'attributes.state') as Record<string, unknown> | undefined;
  if (!state) return;

  // 2. Lens state-level query (attributes.state.query.esql)
  const stateQuery = state.query as AggregateQuery | undefined;
  if (stateQuery?.esql) {
    stateQuery.esql = replaceEsqlPlaceholder(stateQuery.esql, indexPattern);
  }

  // 3. Text-based (ES|QL) layer queries
  const textBasedLayers = get(state, 'datasourceStates.textBased.layers') as
    | Record<string, TextBasedLayer>
    | undefined;
  for (const layer of Object.values(textBasedLayers ?? {})) {
    if (layer.query?.esql) {
      layer.query.esql = replaceEsqlPlaceholder(layer.query.esql, indexPattern);
    }
  }

  // 4. Text-based indexPatternRefs (title shown in Lens editor)
  const indexPatternRefs = get(state, 'datasourceStates.textBased.indexPatternRefs') as
    | Array<{ id?: string; title?: string }>
    | undefined;
  for (const ref of indexPatternRefs ?? []) {
    if (ref.title === INDEX_PATTERN_PLACEHOLDER) ref.title = indexPattern;
  }

  // 5. Ad-hoc data views (title and name)
  const adHocDataViews = get(state, 'adHocDataViews') as
    | Record<string, { title?: string; name?: string }>
    | undefined;
  for (const dv of Object.values(adHocDataViews ?? {})) {
    if (dv.title === INDEX_PATTERN_PLACEHOLDER) dv.title = indexPattern;
    if (dv.name === INDEX_PATTERN_PLACEHOLDER) dv.name = indexPattern;
  }

  // 6. Form-based layers (indexPatternId → data view ID)
  const formBasedLayers = get(state, 'datasourceStates.formBased.layers') as
    | Record<string, { indexPatternId?: string }>
    | undefined;
  for (const layer of Object.values(formBasedLayers ?? {})) {
    if (layer.indexPatternId === INDEX_PATTERN_PLACEHOLDER) layer.indexPatternId = dataViewId;
  }

  // 7. Form-based currentIndexPatternId
  const formBased = get(state, 'datasourceStates.formBased') as
    | { currentIndexPatternId?: string }
    | undefined;
  if (formBased?.currentIndexPatternId === INDEX_PATTERN_PLACEHOLDER) {
    formBased.currentIndexPatternId = dataViewId;
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
      const section = item as DashboardSection;
      if (section.panels) {
        injectDataViewIntoPanels(section.panels, indexPattern, dataViewId);
      }
    } else {
      const panel = item as DashboardPanel;
      if (panel.config) {
        injectDataViewIntoConfig(panel.config as Record<string, unknown>, indexPattern, dataViewId);
      }
    }
  }
}

/**
 * Load a dashboard definition and inject the data view.
 *
 * Dashboard JSON files are POJOs with `{{indexPattern}}` as a placeholder.
 * Each known config location is updated explicitly.
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
  const { panels, references } = JSON.parse(JSON.stringify(raw)) as DashboardDefinition;

  const indexPattern = props.dataView.getIndexPattern();
  const dataViewId = props.dataView.id ?? '';

  // Inject into all panel configs
  injectDataViewIntoPanels(panels, indexPattern, dataViewId);

  // Patch reference IDs
  const updatedReferences = references.map((ref) =>
    ref.type === 'index-pattern' && ref.id === INDEX_PATTERN_PLACEHOLDER
      ? { ...ref, id: dataViewId }
      : ref
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
