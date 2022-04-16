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
  PartialTheme,
} from '@elastic/charts';
import {
  EuiCheckbox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  euiPaletteForTemperature,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { find, sumBy } from 'lodash';
import { rgba } from 'polished';
import React, { useMemo, useState } from 'react';
import seedrandom from 'seedrandom';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useChartTheme } from '@kbn/observability-plugin/public';
import {
  getValueTypeConfig,
  ProfileNode,
  ProfilingValueType,
  ProfilingValueTypeUnit,
} from '../../../../common/profiling';
import {
  asDuration,
  asDynamicBytes,
  asInteger,
} from '../../../../common/utils/formatters';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';
import { unit } from '../../../utils/style';

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

const formatValue = (
  value: number,
  valueUnit: ProfilingValueTypeUnit
): string => {
  switch (valueUnit) {
    case ProfilingValueTypeUnit.ns:
      return asDuration(value / 1000);

    case ProfilingValueTypeUnit.us:
      return asDuration(value);

    case ProfilingValueTypeUnit.count:
      return asInteger(value);

    case ProfilingValueTypeUnit.bytes:
      return asDynamicBytes(value);
  }
};

function CustomTooltip({
  values,
  nodes,
  valueUnit,
}: TooltipInfo & {
  nodes: Record<string, ProfileNode>;
  valueUnit: ProfilingValueTypeUnit;
}) {
  const first = values[0];

  const foundNode = find(nodes, (node) => node.label === first.label);

  const label = foundNode?.fqn ?? first.label;
  const value = formatValue(first.value, valueUnit) + first.formattedValue;

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
  kuery,
  valueType,
  start,
  end,
}: {
  serviceName: string;
  environment: string;
  kuery: string;
  valueType?: ProfilingValueType;
  start?: string;
  end?: string;
}) {
  const theme = useTheme();

  const [collapseSimilarFrames, setCollapseSimilarFrames] = useState(true);
  const [highlightFilter, setHighlightFilter] = useState('');

  const { data } = useFetcher(
    (callApmApi) => {
      if (!start || !end || !valueType) {
        return undefined;
      }

      return callApmApi(
        'GET /internal/apm/services/{serviceName}/profiling/statistics',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              kuery,
              start,
              end,
              environment,
              valueType,
            },
          },
        }
      );
    },
    [kuery, start, end, environment, serviceName, valueType]
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
              // TODO: apply highlight to entire stack, not just node
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
  const themeOverrides: PartialTheme = {
    chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
    partition: {
      fillLabel: {
        fontFamily: theme.eui.euiCodeFontFamily,
        clipText: true,
      },
      fontFamily: theme.eui.euiCodeFontFamily,
      minFontSize: 9,
      maxFontSize: 9,
    },
  };

  const chartSize = {
    height: layers.length * 20,
    width: '100%',
  };

  const items = Object.values(data?.nodes ?? {}).filter((node) =>
    highlightFilter ? node.fqn.includes(highlightFilter) : true
  );

  const valueUnit = valueType
    ? getValueTypeConfig(valueType).unit
    : ProfilingValueTypeUnit.count;

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow>
        <Chart size={chartSize}>
          <Settings
            theme={[themeOverrides, ...chartTheme]}
            tooltip={{
              customTooltip: (info) => (
                <CustomTooltip
                  {...info}
                  valueUnit={valueUnit}
                  nodes={data?.nodes ?? {}}
                />
              ),
            }}
          />
          <Partition
            id="profile_graph"
            data={points}
            layers={layers}
            drilldown
            maxRowCount={1}
            layout={PartitionLayout.icicle}
            valueAccessor={(d: Datum) => d.value as number}
            valueFormatter={() => ''}
          />
        </Chart>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: unit * 24 }}>
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
                  setHighlightFilter(() => (e.target as any).value);
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
              }}
              pagination={{
                pageSize: 20,
                showPerPageOptions: false,
              }}
              compressed
              columns={[
                {
                  field: 'label',
                  name: i18n.translate('xpack.apm.profiling.table.name', {
                    defaultMessage: 'Name',
                  }),
                  truncateText: true,
                  render: (_, item) => {
                    return (
                      <EuiToolTip content={item.fqn}>
                        <span>{item.label}</span>
                      </EuiToolTip>
                    );
                  },
                },
                {
                  field: 'value',
                  name: i18n.translate('xpack.apm.profiling.table.value', {
                    defaultMessage: 'Self',
                  }),
                  render: (_, item) => formatValue(item.value, valueUnit),
                  width: `${unit * 6}px`,
                },
              ]}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
