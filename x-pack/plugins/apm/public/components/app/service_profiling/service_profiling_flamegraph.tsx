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
import { Query } from '@elastic/eui';
import { EuiSelect } from '@elastic/eui';
import { EuiSearchBar } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  euiPaletteForTemperature,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { find, keyBy, compact } from 'lodash';
import { rgba } from 'polished';
import React, { useMemo, useState } from 'react';
import seedrandom from 'seedrandom';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { useChartTheme } from '../../../../../observability/public';
import {
  getValueTypeConfig,
  ProfilingValueType,
  ProfilingValueTypeUnit,
} from '../../../../common/profiling';
import {
  asDuration,
  asDynamicBytes,
  asInteger,
} from '../../../../common/utils/formatters';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';
import { px, unit } from '../../../style/variables';

const colors = euiPaletteForTemperature(100).slice(50, 85);

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
  locations,
  valueUnit,
}: TooltipInfo & {
  locations: Record<
    string,
    { filename?: string; function: string; fqn: string }
  >;
  valueUnit: ProfilingValueTypeUnit;
}) {
  const first = values[0];

  const foundNode = find(
    locations,
    (location) => location.function === first.label
  );

  const label = foundNode?.fqn ?? first.label;
  const formattedValue =
    formatValue(first.value, valueUnit) + first.formattedValue;

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
            {formattedValue}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </TooltipContainer>
  );
}

enum QueryMode {
  highlight = 'highlight',
  show = 'show',
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
  environment?: string;
  kuery?: string;
  valueType?: ProfilingValueType;
  start?: string;
  end?: string;
}) {
  const theme = useTheme();

  const {
    core: { notifications },
  } = useApmPluginContext();

  const [query, setQuery] = useState<Query | string>('');

  const [queryMode, setQueryMode] = useState<QueryMode>(QueryMode.show);

  const highlightQuery = queryMode === QueryMode.highlight ? query : undefined;
  const showQuery = queryMode === QueryMode.show ? query : undefined;

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
            kuery,
            start,
            end,
            environment,
            valueType,
          },
        },
      });
    },
    [kuery, start, end, environment, serviceName, valueType]
  );

  const hydrated = useMemo(() => {
    if (!data) {
      return undefined;
    }

    const root = {
      function: 'root',
      fqn: 'root',
      total: 0,
      self: 0,
    };

    const { frames, locations, samples } = data;

    const locationsWithFqns = locations.map((location) => {
      const fqn = [
        location.filename,
        [location.function, location.line].filter(Boolean).join(':'),
      ].join('/');
      return {
        ...location,
        total: 0,
        self: 0,
        fqn,
      };
    });

    const locationsByFqn = keyBy(
      locationsWithFqns.concat(root),
      (location) => location.fqn
    );

    const hydratedSamples = samples.map((sample) => {
      return {
        ...sample,
        frames: sample.frames.map((frameRef) => {
          return locationsWithFqns[frames[frameRef]];
        }),
      };
    });

    hydratedSamples.forEach((sample) => {
      const top = sample.frames[0];
      top.self += sample.value;
      sample.frames.forEach((frame) => {
        frame.total += sample.value;
      });
    });

    return {
      locations: locationsByFqn,
      samples: hydratedSamples,
    };
  }, [data]);

  const points = useMemo(() => {
    return compact(
      hydrated?.samples.map((sample) => {
        const visibleFrames =
          showQuery && showQuery.toString()
            ? EuiSearchBar.Query.execute(showQuery, sample.frames)
            : sample.frames;

        const top = visibleFrames[0];

        if (!top) {
          return;
        }

        const depth = visibleFrames.length;

        return {
          id: top.fqn,
          value: sample.value,
          depth,
          layers: visibleFrames.reduce(
            (prev, current, index, array) => {
              prev[depth - index] = current.fqn;
              return prev;
            },
            {
              '0': 'root',
            } as Record<string, string>
          ),
        };
      }) ?? []
    );
  }, [hydrated, showQuery]);

  const layers = useMemo(() => {
    if (!hydrated || !points.length) {
      return [];
    }

    const { locations } = hydrated;

    const maxDepth = Math.min(
      Math.max(...points.map((point) => point.depth)),
      25
    );

    return [...new Array(maxDepth)].map((_, depth) => {
      return {
        groupByRollup: (d: Datum) => d.layers[depth],
        nodeLabel: (id: PrimitiveValue) => {
          if (locations[id!]) {
            return locations[id!].function;
          }
          return '';
        },
        showAccessor: (id: PrimitiveValue) => !!id,
        shape: {
          fillColor: (d: { dataName: string }) => {
            const location = locations[d.dataName];

            const isHighlighted =
              !highlightQuery ||
              !highlightQuery.toString() ||
              EuiSearchBar.Query.execute(highlightQuery, [location]).length > 0;

            if (!isHighlighted) {
              return rgba(0, 0, 0, 0.25);
            }

            const integer =
              Math.abs(seedrandom(d.dataName).int32()) % colors.length;
            return colors[integer];
          },
        },
      };
    });
  }, [points, hydrated, highlightQuery]);

  const chartTheme = useChartTheme();

  const chartSize = {
    height: layers.length * 20,
    width: '100%',
  };

  const valueUnit = valueType
    ? getValueTypeConfig(valueType).unit
    : ProfilingValueTypeUnit.count;

  const items = EuiSearchBar.Query.execute(
    query,
    Object.values(hydrated?.locations ?? {})
  );

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow>
        <Chart size={chartSize}>
          <Settings
            theme={chartTheme}
            tooltip={{
              customTooltip: (info) => (
                <CustomTooltip
                  {...info}
                  valueUnit={valueUnit}
                  locations={hydrated?.locations ?? {}}
                />
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
                clipText: true,
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
      <EuiFlexItem grow={false} style={{ width: px(unit * 32) }}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiSearchBar
              onChange={({ query: nextQuery, queryText, error }) => {
                if (nextQuery) {
                  setQuery(nextQuery);
                } else {
                  notifications.toasts.addWarning(
                    error?.message ?? 'Error parsing query'
                  );
                  setQuery(queryText);
                }
              }}
              query={query}
              box={{
                placeholder: '-function:"(program)"',
                schema: {
                  fields: {
                    function: {
                      type: 'string',
                    },
                    filename: {
                      type: 'string',
                    },
                    fqn: {
                      type: 'string',
                    },
                  },
                },
              }}
              toolsRight={
                <EuiSelect
                  compressed
                  value={queryMode}
                  onChange={(e) => {
                    setQueryMode((e.target.value as unknown) as QueryMode);
                  }}
                  options={[
                    {
                      value: QueryMode.highlight,
                      text: i18n.translate(
                        'xpack.apm.profiling.queryMode.highlight',
                        { defaultMessage: 'Highlight' }
                      ),
                    },
                    {
                      value: QueryMode.show,
                      text: i18n.translate(
                        'xpack.apm.profiling.queryMode.show',
                        { defaultMessage: 'Show' }
                      ),
                    },
                  ]}
                />
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiInMemoryTable
              items={items}
              sorting={{
                sort: {
                  field: 'self',
                  direction: 'desc',
                },
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
                  render: (_, item) => {
                    return (
                      <EuiToolTip content={item.fqn}>
                        <span>{item.function}</span>
                      </EuiToolTip>
                    );
                  },
                },
                {
                  field: 'self',
                  name: i18n.translate('xpack.apm.profiling.table.self', {
                    defaultMessage: 'Self',
                  }),
                  render: (_, item) => formatValue(item.self, valueUnit),
                  width: px(unit * 6),
                  sortable: true,
                },
                {
                  field: 'total',
                  name: i18n.translate('xpack.apm.profiling.table.total', {
                    defaultMessage: 'Total',
                  }),
                  render: (_, item) => formatValue(item.total, valueUnit),
                  width: px(unit * 6),
                  sortable: true,
                },
              ]}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
