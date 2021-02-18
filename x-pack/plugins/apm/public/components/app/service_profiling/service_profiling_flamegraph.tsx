/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  Chart,
  Datum,
  Partition,
  PartitionLayout,
  PrimitiveValue,
  Settings,
  TooltipInfo,
} from '@elastic/charts';
import { EuiInMemoryTable } from '@elastic/eui';
import { EuiFieldText } from '@elastic/eui';
import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  euiPaletteForTemperature,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { find, sumBy, sortBy } from 'lodash';
import { rgba } from 'polished';
import React, { useMemo, useState } from 'react';
import seedrandom from 'seedrandom';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { useChartTheme } from '../../../../../observability/public';
import { ProfileNode, ProfilingValueType } from '../../../../common/profiling';
import { asDuration } from '../../../../common/utils/formatters';
import { UIFilters } from '../../../../typings/ui_filters';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';
import { px, unit } from '../../../style/variables';

const colors = euiPaletteForTemperature(100).slice(50, 85);

interface ProfileDataPoint {
  id: string;
  value: number;
  depth: number;
  layers: Record<string, string>;
}

const TooltipContainer = euiStyled.div`
  background-color: ${(props) => props.theme.eui.euiColorDarkestShade};
  border-radius: ${(props) => props.theme.eui.euiBorderRadius};
  color: ${(props) => props.theme.eui.euiColorLightestShade};
  padding: ${(props) => props.theme.eui.paddingSizes.s};
`;

function CustomTooltip({
  values,
  nodes,
}: TooltipInfo & {
  nodes: Record<string, ProfileNode>;
}) {
  const first = values[0];

  const foundNode = find(nodes, (node) => node.label === first.label);

  const label = foundNode?.fqn ?? first.label;
  const value = asDuration(first.value) + first.formattedValue;

  return (
    <TooltipContainer>
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        alignItems="center"
        justifyContent="flexStart"
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type="dot" color={first.color} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{label}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" style={{ fontWeight: 500 }}>
            {value}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </TooltipContainer>
  );
}

export function ServiceProfilingFlamegraph({
  serviceName,
  environment,
  valueType,
  start,
  end,
  uiFilters,
}: {
  serviceName: string;
  environment?: string;
  valueType?: ProfilingValueType;
  start?: string;
  end?: string;
  uiFilters: UIFilters;
}) {
  const theme = useTheme();

  const [collapseSimilarFrames, setCollapseSimilarFrames] = useState(true);
  const [highlightFilter, setHighlightFilter] = useState('');

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
            uiFilters: JSON.stringify(uiFilters),
          },
        },
      });
    },
    [start, end, environment, serviceName, valueType, uiFilters]
  );

  const points = useMemo(() => {
    if (!data) {
      return [];
    }

    const { rootNodes, nodes } = data;

    const getDataPoints = (
      node: ProfileNode,
      depth: number
    ): ProfileDataPoint[] => {
      const { children } = node;

      if (!children.length) {
        // edge
        return [
          {
            id: node.id,
            value: node.value,
            depth,
            layers: {
              [depth]: node.id,
            },
          },
        ];
      }

      const directChildNodes = children.map((childId) => nodes[childId]);

      const shouldCollapse =
        collapseSimilarFrames &&
        node.value === 0 &&
        directChildNodes.length === 1 &&
        directChildNodes[0].value === 0;

      const nextDepth = shouldCollapse ? depth : depth + 1;

      const childDataPoints = children.flatMap((childId) =>
        getDataPoints(nodes[childId], nextDepth)
      );

      if (!shouldCollapse) {
        childDataPoints.forEach((point) => {
          point.layers[depth] = node.id;
        });
      }

      const totalTime = sumBy(childDataPoints, 'value');
      const selfTime = node.value - totalTime;

      if (selfTime === 0) {
        return childDataPoints;
      }

      return [
        ...childDataPoints,
        {
          id: '',
          value: selfTime,
          layers: { [nextDepth]: '' },
          depth,
        },
      ];
    };

    const root = {
      id: 'root',
      label: 'root',
      fqn: 'root',
      children: rootNodes,
      value: 0,
    };

    nodes.root = root;

    return getDataPoints(root, 0);
  }, [data, collapseSimilarFrames]);

  const layers = useMemo(() => {
    if (!data || !points.length) {
      return [];
    }

    const { nodes } = data;

    const maxDepth = Math.max(...points.map((point) => point.depth));

    return [...new Array(maxDepth)].map((_, depth) => {
      return {
        groupByRollup: (d: Datum) => d.layers[depth],
        nodeLabel: (id: PrimitiveValue) => {
          if (nodes[id!]) {
            return nodes[id!].label;
          }
          return '';
        },
        showAccessor: (id: PrimitiveValue) => !!id,
        shape: {
          fillColor: (d: { dataName: string }) => {
            const node = nodes[d.dataName];

            if (
              !node ||
              (highlightFilter && !node.fqn.includes(highlightFilter))
            ) {
              return rgba(0, 0, 0, 0.25);
            }

            const integer =
              Math.abs(seedrandom(d.dataName).int32()) % colors.length;
            return colors[integer];
          },
        },
      };
    });
  }, [points, highlightFilter, data]);

  const chartTheme = useChartTheme();

  const chartSize = {
    height: layers.length * 20,
    width: '100%',
  };

  const items = Object.values(data?.nodes ?? {}).filter((node) =>
    highlightFilter ? node.fqn.includes(highlightFilter) : true
  );

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow>
        <Chart size={chartSize}>
          <Settings
            theme={chartTheme}
            tooltip={{
              customTooltip: (info) => (
                <CustomTooltip {...info} nodes={data?.nodes ?? {}} />
              ),
            }}
          />
          <Partition
            id="profile_graph"
            data={points}
            layers={layers}
            valueAccessor={(d: Datum) => d.value as number}
            valueFormatter={() => ''}
            config={{
              fillLabel: {
                fontFamily: theme.eui.euiCodeFontFamily,
                clip: true,
              },
              drilldown: true,
              fontFamily: theme.eui.euiCodeFontFamily,
              minFontSize: 9,
              maxFontSize: 9,
              maxRowCount: 1,
              partitionLayout: PartitionLayout.icicle,
            }}
          />
        </Chart>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: px(unit * 24) }}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id="collapse_similar_frames"
              checked={collapseSimilarFrames}
              onChange={() => {
                setCollapseSimilarFrames((state) => !state);
              }}
              label={i18n.translate(
                'xpack.apm.profiling.collapseSimilarFrames',
                {
                  defaultMessage: 'Collapse similar',
                }
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFieldText
              placeholder={i18n.translate(
                'xpack.apm.profiling.highlightFrames',
                { defaultMessage: 'Search' }
              )}
              onChange={(e) => {
                if (!e.target.value) {
                  setHighlightFilter('');
                }
              }}
              onKeyPress={(e) => {
                if (e.charCode === 13) {
                  setHighlightFilter(() => e.target.value);
                }
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiInMemoryTable
              items={items}
              sorting={{
                sort: {
                  field: 'value',
                  direction: 'desc',
                },
                enableAllColumns: true,
              }}
              pagination={{
                pageSize: 20,
                hidePerPageOptions: true,
              }}
              compressed
              columns={[
                {
                  field: 'label',
                  name: i18n.translate('xpack.apm.profiling.table.name', {
                    defaultMessage: 'Name',
                  }),
                  truncateText: true,
                },
                {
                  field: 'value',
                  name: i18n.translate('xpack.apm.profiling.table.value', {
                    defaultMessage: 'Value',
                  }),
                  render: (us) => asDuration(us),
                  width: px(unit * 6),
                },
              ]}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
