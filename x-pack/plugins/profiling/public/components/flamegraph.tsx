/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Chart, Datum, Flame, FlameLayerValue, PartialTheme, Settings } from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Maybe } from '@kbn/observability-plugin/common/typings';
import { isNumber } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { ElasticFlameGraph, FlameGraphComparisonMode } from '../../common/flamegraph';
import { asPercentage } from '../utils/formatters/as_percentage';
import { getFlamegraphModel } from '../utils/get_flamegraph_model';
import { FlamegraphInformationWindow } from './flame_graphs_view/flamegraph_information_window';
import { FlameGraphLegend } from './flame_graphs_view/flame_graph_legend';

function TooltipRow({
  value,
  label,
  comparison,
  formatAsPercentage,
  showChange,
}: {
  value: number;
  label: string;
  comparison?: number;
  formatAsPercentage: boolean;
  showChange: boolean;
}) {
  const valueLabel = formatAsPercentage ? asPercentage(Math.abs(value)) : value.toString();
  const comparisonLabel =
    formatAsPercentage && isNumber(comparison) ? asPercentage(comparison) : comparison?.toString();

  let diff: number | undefined;
  let diffLabel = '';
  let color = '';

  if (isNumber(comparison)) {
    if (showChange) {
      color = value < comparison ? 'danger' : 'success';
      if (formatAsPercentage) {
        // CPU percent values
        diff = comparison - value;
        diffLabel =
          '(' + (diff > 0 ? '+' : diff < 0 ? '-' : '') + asPercentage(Math.abs(diff)) + ')';
      } else {
        // Sample counts
        diff = 1 - comparison / value;
        diffLabel =
          '(' + (diff > 0 ? '-' : diff < 0 ? '+' : '') + asPercentage(Math.abs(diff)) + ')';
      }
      if (Math.abs(diff) < 0.0001) {
        diffLabel = '';
      }
    }
  }

  return (
    <EuiFlexItem style={{ width: 256, overflowWrap: 'anywhere' }}>
      <EuiFlexGroup direction="row" gutterSize="xs">
        <EuiFlexItem style={{}}>
          <EuiText size="xs">
            <strong>{label}</strong>
          </EuiText>
          <EuiText size="xs" style={{ marginLeft: '20px' }}>
            {comparison !== undefined
              ? i18n.translate('xpack.profiling.flameGraphTooltip.valueLabel', {
                  defaultMessage: `{value} vs {comparison}`,
                  values: {
                    value: valueLabel,
                    comparison: comparisonLabel,
                  },
                })
              : valueLabel}
            <EuiTextColor color={color}> {diffLabel}</EuiTextColor>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
    </EuiFlexItem>
  );
}

function FlameGraphTooltip({
  isRoot,
  label,
  countInclusive,
  countExclusive,
  samples,
  totalSamples,
  comparisonCountInclusive,
  comparisonCountExclusive,
  comparisonSamples,
  comparisonTotalSamples,
}: {
  isRoot: boolean;
  samples: number;
  label: string;
  countInclusive: number;
  countExclusive: number;
  totalSamples: number;
  comparisonCountInclusive?: number;
  comparisonCountExclusive?: number;
  comparisonSamples?: number;
  comparisonTotalSamples?: number;
}) {
  return (
    <EuiPanel>
      <EuiFlexGroup
        direction="column"
        gutterSize="m"
        style={{
          overflowWrap: 'anywhere',
        }}
      >
        <EuiFlexItem>{label}</EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="xs">
            {isRoot === false && (
              <>
                <TooltipRow
                  label={i18n.translate('xpack.profiling.flameGraphTooltip.inclusiveCpuLabel', {
                    defaultMessage: `CPU incl. subfunctions`,
                  })}
                  value={countInclusive / totalSamples}
                  comparison={
                    isNumber(comparisonCountInclusive) && isNumber(comparisonTotalSamples)
                      ? comparisonCountInclusive / comparisonTotalSamples
                      : undefined
                  }
                  formatAsPercentage
                  showChange
                />
                <TooltipRow
                  label={i18n.translate('xpack.profiling.flameGraphTooltip.exclusiveCpuLabel', {
                    defaultMessage: `CPU`,
                  })}
                  value={countExclusive / totalSamples}
                  comparison={
                    isNumber(comparisonCountExclusive) && isNumber(comparisonTotalSamples)
                      ? comparisonCountExclusive / comparisonTotalSamples
                      : undefined
                  }
                  formatAsPercentage
                  showChange
                />
              </>
            )}
            <TooltipRow
              label={i18n.translate('xpack.profiling.flameGraphTooltip.samplesLabel', {
                defaultMessage: `Samples`,
              })}
              value={countInclusive}
              comparison={comparisonCountInclusive}
              formatAsPercentage={false}
              showChange
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export interface FlameGraphProps {
  id: string;
  comparisonMode: FlameGraphComparisonMode;
  primaryFlamegraph?: ElasticFlameGraph;
  comparisonFlamegraph?: ElasticFlameGraph;
}

export const FlameGraph: React.FC<FlameGraphProps> = ({
  id,
  comparisonMode,
  primaryFlamegraph,
  comparisonFlamegraph,
}) => {
  const theme = useEuiTheme();

  const columnarData = useMemo(() => {
    return getFlamegraphModel({
      primaryFlamegraph,
      comparisonFlamegraph,
      colorSuccess: theme.euiTheme.colors.success,
      colorDanger: theme.euiTheme.colors.danger,
      colorNeutral: theme.euiTheme.colors.lightShade,
      comparisonMode,
    });
  }, [
    primaryFlamegraph,
    comparisonFlamegraph,
    theme.euiTheme.colors.success,
    theme.euiTheme.colors.danger,
    theme.euiTheme.colors.lightShade,
    comparisonMode,
  ]);

  const chartTheme: PartialTheme = {
    chartMargins: { top: 0, left: 0, bottom: 0, right: 0 },
    chartPaddings: { left: 0, right: 0, top: 0, bottom: 0 },
  };

  const totalSamples = columnarData.viewModel.value[0];

  const [highlightedVmIndex, setHighlightedVmIndex] = useState<number | undefined>(undefined);

  const selected: undefined | React.ComponentProps<typeof FlamegraphInformationWindow>['frame'] =
    primaryFlamegraph && highlightedVmIndex !== undefined
      ? {
          fileID: primaryFlamegraph.FileID[highlightedVmIndex],
          frameType: primaryFlamegraph.FrameType[highlightedVmIndex],
          exeFileName: primaryFlamegraph.ExeFilename[highlightedVmIndex],
          addressOrLine: primaryFlamegraph.AddressOrLine[highlightedVmIndex],
          functionName: primaryFlamegraph.FunctionName[highlightedVmIndex],
          sourceFileName: primaryFlamegraph.SourceFilename[highlightedVmIndex],
          sourceLine: primaryFlamegraph.SourceLine[highlightedVmIndex],
          countInclusive: primaryFlamegraph.CountInclusive[highlightedVmIndex],
          countExclusive: primaryFlamegraph.CountExclusive[highlightedVmIndex],
        }
      : undefined;

  useEffect(() => {
    setHighlightedVmIndex(undefined);
  }, [columnarData.key]);

  const [showInformationWindow, setShowInformationWindow] = useState(false);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false} style={{ alignSelf: 'flex-end' }}>
        <EuiSwitch
          checked={showInformationWindow}
          onChange={() => {
            setShowInformationWindow((prev) => !prev);
          }}
          label={i18n.translate('xpack.profiling.flameGraph.showInformationWindow', {
            defaultMessage: 'Show information window',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="row">
          {columnarData.viewModel.label.length > 0 && (
            <EuiFlexItem grow>
              <Chart key={columnarData.key}>
                <Settings
                  theme={chartTheme}
                  onElementClick={(elements) => {
                    const selectedElement = elements[0] as Maybe<FlameLayerValue>;
                    if (Number.isNaN(selectedElement?.vmIndex)) {
                      setHighlightedVmIndex(undefined);
                    } else {
                      setHighlightedVmIndex(selectedElement!.vmIndex);
                    }
                  }}
                  tooltip={{
                    customTooltip: (props) => {
                      if (!primaryFlamegraph) {
                        return <></>;
                      }

                      const valueIndex = props.values[0].valueAccessor as number;
                      const label = primaryFlamegraph.Label[valueIndex];
                      const samples = primaryFlamegraph.CountInclusive[valueIndex];
                      const countInclusive = primaryFlamegraph.CountInclusive[valueIndex];
                      const countExclusive = primaryFlamegraph.CountExclusive[valueIndex];
                      const nodeID = primaryFlamegraph.ID[valueIndex];

                      const comparisonNode = columnarData.comparisonNodesById[nodeID];

                      return (
                        <FlameGraphTooltip
                          isRoot={valueIndex === 0}
                          label={label}
                          samples={samples}
                          countInclusive={countInclusive}
                          countExclusive={countExclusive}
                          comparisonCountInclusive={comparisonNode?.CountInclusive}
                          comparisonCountExclusive={comparisonNode?.CountExclusive}
                          totalSamples={totalSamples}
                          comparisonTotalSamples={comparisonFlamegraph?.CountInclusive[0]}
                          comparisonSamples={comparisonNode?.CountInclusive}
                        />
                      );
                    },
                  }}
                />
                <Flame
                  id={id}
                  columnarData={columnarData.viewModel}
                  valueAccessor={(d: Datum) => d.value as number}
                  valueFormatter={(value) => `${value}`}
                  animation={{ duration: 100 }}
                  controlProviderCallback={{}}
                />
              </Chart>
            </EuiFlexItem>
          )}
          {showInformationWindow ? (
            <EuiFlexItem grow={false}>
              <FlamegraphInformationWindow
                frame={selected}
                totalSeconds={primaryFlamegraph?.TotalSeconds ?? 0}
                totalSamples={totalSamples}
                onClose={() => {
                  setShowInformationWindow(false);
                }}
              />
            </EuiFlexItem>
          ) : undefined}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FlameGraphLegend legendItems={columnarData.legendItems} asScale={!!comparisonFlamegraph} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
