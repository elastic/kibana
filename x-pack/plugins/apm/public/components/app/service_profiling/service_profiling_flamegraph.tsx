/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { sumBy } from 'lodash';
import {
  Chart,
  Datum,
  Partition,
  PartitionLayout,
  PrimitiveValue,
  Settings,
} from '@elastic/charts';
import { euiPaletteForTemperature } from '@elastic/eui';
import { useMemo } from 'react';
import { useChartTheme } from '../../../../../observability/public';
import { ProfileNode, ProfilingValueType } from '../../../../common/profiling';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';

interface ProfileDataPoint {
  value: number;
  name: string | undefined;
  depth: number;
  layers: Record<string, string>;
}

export function ServiceProfilingFlamegraph({
  serviceName,
  environment,
  valueType,
  start,
  end,
}: {
  serviceName: string;
  environment?: string;
  valueType?: ProfilingValueType;
  start?: string;
  end?: string;
}) {
  const theme = useTheme();

  const { data } = useFetcher(
    (callApmApi) => {
      if (!start || !end || !valueType) {
        return undefined;
      }

      return callApmApi({
        endpoint: 'GET /api/apm/services/{serviceName}/profiling/statistics',
        params: {
          path: {
            serviceName,
          },
          query: {
            start,
            end,
            environment,
            valueType,
          },
        },
      });
    },
    [start, end, environment, serviceName, valueType]
  );

  const spec = useMemo(() => {
    if (!data) {
      return {
        layers: [],
        points: [],
      };
    }

    const { rootNodes, nodes } = data;

    const getDataPoints = (
      node: ProfileNode,
      depth: number
    ): ProfileDataPoint[] => {
      const { children } = node;

      if (!children.length) {
        return [
          {
            name: node.name,
            value: node.value,
            depth,
            layers: {
              [depth]: node.name,
            },
          },
        ];
      }

      const childDataPoints = children
        .flatMap((childId) => getDataPoints(nodes[childId], depth + 1))
        .map((point) => ({
          ...point,
          layers: {
            ...point.layers,
            [depth]: node.name,
          },
        }));

      const totalTime = sumBy(childDataPoints, 'value');
      const selfTime = node.value - totalTime;

      if (selfTime === 0) {
        return childDataPoints;
      }

      return [
        ...childDataPoints,
        {
          name: undefined,
          value: selfTime,
          layers: { [depth + 1]: undefined },
          depth,
        },
      ];
    };

    const root = {
      name: 'root',
      id: 'root',
      children: rootNodes,
      ...rootNodes.reduce(
        (prev, id) => {
          const node = nodes[id];

          return {
            value: prev.value + node.value,
            count: prev.count + node.count,
          };
        },
        { value: 0, count: 0 }
      ),
    };

    const points = getDataPoints(root, 0);

    const maxDepth = Math.max(...points.map((point) => point.depth));

    const colors = euiPaletteForTemperature(80).slice(50);

    const layers = [...new Array(maxDepth)].map((_, depth) => {
      return {
        groupByRollup: (d: Datum) => d.layers[depth],
        nodeLabel: (d: PrimitiveValue) => String(d),
        showAccessor: (d: PrimitiveValue) => !!d,
        shape: {
          fillColor: () => colors[Math.floor(Math.random() * colors.length)],
        },
      };
    });

    return {
      points,
      layers,
    };
  }, [data]);

  const chartTheme = useChartTheme();

  const chartSize = {
    height: 600,
    width: '100%',
  };

  return (
    <Chart size={chartSize}>
      <Settings theme={chartTheme} />
      <Partition
        id="profile_graph"
        data={spec.points}
        layers={spec.layers}
        valueAccessor={(d: Datum) => d.value as number}
        valueFormatter={() => ''}
        config={{
          fillLabel: {
            fontFamily: theme.eui.euiCodeFontFamily,
          },
          fontFamily: theme.eui.euiCodeFontFamily,
          minFontSize: 9,
          maxFontSize: 9,
          partitionLayout: PartitionLayout.icicle,
        }}
      />
    </Chart>
  );
}
