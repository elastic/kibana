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
  SavedDashboardPanel,
} from '@kbn/dashboard-plugin/server';
import type { Reference } from '@kbn/content-management-utils';
import { Parser, BasicPrettyPrinter } from '@kbn/esql-language';
import type { ESQLSource } from '@kbn/esql-language';
import {
  existingDashboardFileNames,
  loadDashboardFile,
  type InfrastructureDashboardType,
} from './dashboards/dashboard_catalog';

export interface DashboardPanelsResult {
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

interface SavedSection {
  title: string;
  collapsed?: boolean;
  gridData: { y: number; i: string };
}

// Extend SavedDashboardPanel with sectionId which exists in saved object format
type SavedPanelWithSection = SavedDashboardPanel & {
  gridData: SavedDashboardPanel['gridData'] & { sectionId?: string };
};

export function hasDashboard(dashboardType: InfrastructureDashboardType): boolean {
  return existingDashboardFileNames.has(dashboardType);
}

/**
 * Replace the index pattern in an ES|QL query using AST manipulation.
 * Finds the FROM command and replaces the source index with the provided pattern.
 *
 * @param esql - The ES|QL query string
 * @param newIndexPattern - The new index pattern to use
 * @returns The modified ES|QL query string, or the original if parsing fails
 */
function replaceEsqlIndexPattern(esql: string, newIndexPattern: string): string {
  try {
    const { root, errors } = Parser.parse(esql);
    if (errors.length > 0) {
      return esql;
    }

    // Find the FROM or TS command
    const sourceCommand = root.commands.find(({ name }) => ['from', 'ts'].includes(name));
    if (!sourceCommand) {
      return esql;
    }

    // Replace the index source in the FROM command args
    const args = sourceCommand.args as ESQLSource[];
    for (const arg of args) {
      if (arg.sourceType === 'index') {
        // BasicPrettyPrinter uses index.valueUnquoted for printing (quoted patterns)
        if (arg.index) {
          arg.index.valueUnquoted = newIndexPattern;
          arg.index.value = newIndexPattern;
        }
        // Also update name for unquoted patterns
        arg.name = newIndexPattern;
      }
    }

    return BasicPrettyPrinter.print(root);
  } catch (e) {
    return esql;
  }
}

/**
 * Replace ES|QL index patterns and data view IDs in a Lens panel config.
 */
function replaceLensDataViewReferences(
  config: Record<string, unknown>,
  newIndexPattern: string,
  newDataViewId: string
): void {
  // Top-level ES|QL query
  const query = config.query as AggregateQuery | undefined;
  if (query?.esql) {
    query.esql = replaceEsqlIndexPattern(query.esql, newIndexPattern);
  }

  const state = get(config, 'attributes.state') as Record<string, unknown> | undefined;
  if (!state) return;

  // ES|QL layers (textBased datasource)
  const textBasedLayers = get(state, 'datasourceStates.textBased.layers') as
    | Record<string, TextBasedLayer>
    | undefined;
  for (const layer of Object.values(textBasedLayers ?? {})) {
    if (layer.query?.esql) {
      layer.query.esql = replaceEsqlIndexPattern(layer.query.esql, newIndexPattern);
    }
  }

  // Form-based + visualization layers have indexPatternId
  const allLayers = [
    ...Object.values(
      (get(state, 'datasourceStates.formBased.layers') ?? {}) as Record<
        string,
        { indexPatternId?: string }
      >
    ),
    ...((get(state, 'visualization.layers') ?? []) as Array<{ indexPatternId?: string }>),
  ];
  for (const layer of allLayers) {
    if (layer.indexPatternId) layer.indexPatternId = newDataViewId;
  }
}

/**
 * Convert saved dashboard JSON to DashboardState['panels'] for by-value embedding.
 *
 * This is a POC using DashboardRenderer. Parameters are structured to align with
 * DashboardLocatorParams for easier migration to saved dashboards.
 */
export async function getDashboardPanels(
  props: InfrastructureDashboardProps
): Promise<DashboardPanelsResult | undefined> {
  const dashboardModule = hasDashboard(props.dashboardType)
    ? await loadDashboardFile(props.dashboardType)
    : undefined;

  const dashboardJSON = dashboardModule
    ? 'default' in dashboardModule
      ? dashboardModule.default
      : dashboardModule
    : undefined;

  if (!dashboardJSON?.attributes?.panelsJSON) {
    return undefined;
  }

  const savedPanels = JSON.parse(dashboardJSON.attributes.panelsJSON) as SavedPanelWithSection[];
  const savedSections = (dashboardJSON.attributes.sections || []) as SavedSection[];

  // Replace data view IDs in references
  const references = ((dashboardJSON.references || []) as Reference[]).map((ref) =>
    ref.type === 'index-pattern' ? { ...ref, id: props.dataView.id ?? ref.id } : ref
  );

  // Build sections map
  const sectionsMap: Record<string, DashboardSection> = Object.fromEntries(
    savedSections.map(({ gridData: { i: uid, ...grid }, ...rest }) => [
      uid,
      { ...rest, grid, panels: [], uid },
    ])
  );

  // Convert panels and group by section
  const topLevelPanels: DashboardPanel[] = [];

  for (const panel of savedPanels) {
    if (panel.type === 'links') continue; // Skip links panels (require saved object references)

    const { x, y, w, h, sectionId } = panel.gridData;
    const config = {
      id: panel.panelIndex,
      ...panel.embeddableConfig,
      title: panel.title,
      enhancements: (panel.embeddableConfig as Record<string, unknown>)?.enhancements ?? {
        dynamicActions: { events: [] },
      },
    };

    // Inject data view references
    replaceLensDataViewReferences(
      config,
      props.dataView.getIndexPattern(),
      props.dataView.id ?? ''
    );

    const runtimePanel: DashboardPanel = {
      type: panel.type,
      grid: { x, y, w, h },
      uid: panel.panelIndex,
      config,
    };

    if (sectionId && sectionsMap[sectionId]) {
      sectionsMap[sectionId].panels.push(runtimePanel);
    } else {
      topLevelPanels.push(runtimePanel);
    }
  }

  return {
    panels: [...topLevelPanels, ...Object.values(sectionsMap)],
    references,
  };
}

/**
 * Build proper Kibana filters for infrastructure filtering
 * Uses buildCombinedFilter with OR relation for multiple values
 */
export function buildInfrastructureFilters(props: InfrastructureDashboardProps): Filter[] {
  const { dataView, podNames, containerNames, hostNames } = props;
  const filters: Filter[] = [];

  // Build filter for pod names
  if (podNames && podNames.length > 0) {
    const podField = dataView.getFieldByName('kubernetes.pod.name');
    if (podField) {
      const podFilters = podNames.map((name) => buildPhraseFilter(podField, name, dataView));
      filters.push(buildCombinedFilter(BooleanRelation.OR, podFilters, dataView));
    }
  }

  // Build filter for container names (handles both container.name and container.id)
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

  // Build filter for host names
  if (hostNames && hostNames.length > 0) {
    const hostField = dataView.getFieldByName('host.name');
    if (hostField) {
      const hostFilters = hostNames.map((name) => buildPhraseFilter(hostField, name, dataView));
      filters.push(buildCombinedFilter(BooleanRelation.OR, hostFilters, dataView));
    }
  }

  return filters;
}
