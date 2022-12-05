/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmptyPlaceholder } from '@kbn/charts-plugin/public';
import { PaletteRegistry } from '@kbn/coloring';
import { MultiFieldKey } from '@kbn/data-plugin/common';
import type { FormatFactory } from '@kbn/field-formats-plugin/common';
import { findMinMaxByColumnId } from '@kbn/lens-plugin/public';
import React, { useCallback, useMemo } from 'react';
import { D3GraphWrapper } from '../renderer/d3/d3_based';
import { makeNodeId } from '../services/persistence';
import { WorkspaceEdge, WorkspaceNode } from '../types';
import { GraphDecorationResult } from './expression_decoration_fn';
import type { GraphChartProps } from './types';

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value != null;
}

function createNode(field: string, term: string, color: string) {
  return {
    id: makeNodeId(field, term),
    x: 0,
    y: 0,
    label: `${field}: ${term}`,
    icon: 'visGauge',
    data: {
      field,
      term,
    },
    scaledSize: 10,
    parent: null,
    color,
    numChildren: 0,
    kx: 0,
    ky: 0,
  };
}

function createEdge(
  node1: WorkspaceNode,
  node2: WorkspaceNode,
  [metricName, metricWeight]: [string, number],
  curveOffset: number,
  color: string | undefined,
  size: number
) {
  return {
    id: `${node1.id}---${node2.id}---${metricName}`,
    weight: metricWeight,
    width: size,
    label: `${metricName}: ${metricWeight}`,
    source: node1,
    target: node2,
    isSelected: false,
    topTarget: node2,
    topSrc: node1,
    offset: curveOffset,
    color,
  };
}

function EmptyGraph(props: Record<string, string>) {
  return (
    <EmptyPlaceholder className="graphChart__empty" icon={'graphApp'} renderComplete={() => {}} />
  );
}

function createLookupFrom<T extends unknown>(items: Array<T & { [prop]: string }>, prop: 'id') {
  const lookup: Record<string, T> = {};
  for (const item of items) {
    lookup[item[prop]] = item;
  }
  return lookup;
}

function mapSizeTo(value: number, maxWidth: number, { min, max }: { min: number; max: number }) {
  if (min === max) {
    return maxWidth;
  }
  return 5 + (maxWidth * (value - min)) / (max - min);
}

export const GraphRenderer = ({
  data,
  args,
  formatFactory,
  paletteService,
}: GraphChartProps & {
  formatFactory: FormatFactory;
  paletteService: PaletteRegistry;
}) => {
  const accessorId = args.accessor;
  const [fields, colorsMap] = useMemo(() => {
    const localFields: string[] = [];
    if (!accessorId) {
      return localFields;
    }
    const columnMeta = data.columns?.find(({ id }) => id === accessorId)!.meta;
    // Single field
    if (columnMeta.field) {
      localFields.push(columnMeta.field);
    } else {
      // Multi terms case
      const fieldSource = columnMeta.sourceParams?.params;
      if (fieldSource != null && typeof fieldSource === 'object' && !Array.isArray(fieldSource)) {
        // order of the fields here is mapped below in the .keys prop
        localFields.push(...(fieldSource.fields as string[]));
      }
    }
    return [
      localFields,
      paletteService.get(args.palette?.name || 'default').getCategoricalColors(localFields.length),
    ];
  }, [accessorId, data.columns, paletteService, args.palette?.name]);

  const [nodes, nodesLookup] = useMemo(() => {
    if (!accessorId) {
      return [[], {}];
    }

    const createdNodes = new Set();
    const localNodes = data.rows
      .flatMap(({ [accessorId]: value }) => {
        if (typeof value === 'string' && !createdNodes.has(makeNodeId(fields[0], value))) {
          createdNodes.add(makeNodeId(fields[0], value));
          return createNode(fields[0], value, colorsMap[0]);
        }
        return (value as MultiFieldKey).keys.map((term, index) => {
          if (term !== '' && !createdNodes.has(makeNodeId(fields[index], term))) {
            createdNodes.add(makeNodeId(fields[index], term));
            return createNode(fields[index], term, colorsMap[index]);
          }
        });
      })
      .filter(nonNullable);

    return [localNodes, createLookupFrom(localNodes, 'id')];
  }, [accessorId, data.rows, fields, colorsMap]);

  // @TODO: refactor this with the columnToMap thingy
  const [metricNameLookup, minMaxByColumnId] = useMemo(() => {
    const lookup: Record<string, string> = {};
    for (const metricId of args.metrics || []) {
      lookup[metricId] = data.columns.find(({ id }) => id === metricId)!.name;
    }
    return [lookup, findMinMaxByColumnId(args.metrics || [], data)];
  }, [args.metrics, data]);

  const [edges, edgesMetricLookup] = useMemo(() => {
    const metricsLookup: Record<
      string,
      Array<{ edgeId: string; id: string; name: string; value: string | number }>
    > = {};
    if (fields.length < 2 || !args.metrics?.length || !accessorId) {
      return [[], metricsLookup];
    }
    const localEdges = data.rows.flatMap((row) => {
      const value = row[accessorId];
      const metrics = args.metrics!.map((metricId) => [metricId, row[metricId]]);
      const endTerms = (value as MultiFieldKey).keys;
      const rowEdges: WorkspaceEdge[] = [];
      const configById: Record<string, GraphDecorationResult> = {};
      for (const config of args.metricConfig || []) {
        configById[config.metricId] = config;
      }
      // all ids should be mapped with any other ids in the list
      // for each metric
      metrics.forEach(([metricId, metricWeight], mI) => {
        const shouldMapToColor =
          configById[metricId]?.mapValuesTo === 'color' &&
          minMaxByColumnId[metricId] &&
          paletteService;
        const color = shouldMapToColor
          ? paletteService.get('custom').getColorForValue!(
              metricWeight,
              configById[metricId].palette?.params,
              minMaxByColumnId[metricId]
            )
          : undefined;
        const size = !shouldMapToColor
          ? mapSizeTo(
              metricWeight,
              configById[metricId]?.maxWidth || 25,
              minMaxByColumnId[metricId]
            )
          : 10;
        //   for (const [metricId, metricWeight] of metrics) {
        endTerms.forEach((term1, i) => {
          const id1 = makeNodeId(fields[i], term1);
          endTerms.forEach((term2, y) => {
            if (y > i) {
              const id2 = makeNodeId(fields[y], term2);
              const newEdge = createEdge(
                nodesLookup[id1],
                nodesLookup[id2],
                [metricNameLookup[metricId], metricWeight],
                metrics.length > 1 ? mI + 1 : 0,
                color,
                size
              );
              rowEdges.push(newEdge);

              // stabilize the ends id
              const edgeIds = [id1, id2].sort();

              // a bit dirty, but reuse this to store dat in the lookup
              const connectionId = `${edgeIds[0]}---${edgeIds[1]}`;
              if (!metricsLookup[connectionId]) {
                metricsLookup[connectionId] = [];
              }
              metricsLookup[connectionId].push({
                edgeId: newEdge.id,
                id: metricId,
                name: metricNameLookup[metricId],
                value: metricWeight,
              });
            }
          });
        });
      });
      return rowEdges;
    });
    return [localEdges, metricsLookup];
  }, [
    fields,
    args.metrics,
    args.metricConfig,
    accessorId,
    data.rows,
    nodesLookup,
    metricNameLookup,
    minMaxByColumnId,
    paletteService,
  ]);
  //   console.log({ data, args });

  const onEdgeHover = useCallback(
    (edge, ev) => {
      const metrics = edgesMetricLookup[`${edge.source.id}---${edge.target.id}`];
      // eslint-disable-next-line no-console
      console.log({ metrics, hovered: metrics.find(({ edgeId }) => edgeId === edge.id) });
    },
    [edgesMetricLookup]
  );

  if (!fields.length || !args.accessor) {
    return <EmptyGraph />;
  }
  return (
    <D3GraphWrapper
      nodes={nodes}
      edges={edges}
      onNodeClick={(n) => {
        // eslint-disable-next-line no-console
        console.log(n);
      }}
      onEdgeClick={(e) => {
        // eslint-disable-next-line no-console
        console.log(e);
      }}
      onEdgeHover={onEdgeHover}
    />
  );
};
