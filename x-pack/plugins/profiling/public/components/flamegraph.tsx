/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Chart, Datum, Flame, FlameLayerValue, PartialTheme, Settings } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSwitch, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Maybe } from '@kbn/observability-plugin/common/typings';
import { isNumber } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { ElasticFlameGraph, FlameGraphComparisonMode } from '../../common/flamegraph';
import { asPercentage } from '../utils/formatters/as_percentage';
import { getFlamegraphModel } from '../utils/get_flamegraph_model';
import { FlamegraphInformationWindow } from './flame_graphs_view/flamegraph_information_window';

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
  const valueLabel = formatAsPercentage ? asPercentage(value) : value.toString();
  const comparisonLabel =
    formatAsPercentage && isNumber(comparison) ? asPercentage(comparison) : comparison?.toString();

  const diff = showChange && isNumber(comparison) ? comparison - value : undefined;

  let diffLabel: string | undefined = diff?.toString();

  if (diff === 0) {
    diffLabel = i18n.translate('xpack.profiling.flameGraphToolTip.diffNoChange', {
      defaultMessage: 'no change',
    });
  } else if (formatAsPercentage && diff !== undefined) {
    diffLabel = asPercentage(diff);
  }

  return (
    <EuiFlexItem style={{ width: 200, overflowWrap: 'anywhere' }}>
      <EuiFlexGroup direction="row" gutterSize="xs">
        <EuiFlexItem grow={false} style={{ fontWeight: 'bold' }}>
          {label}
        </EuiFlexItem>
        <EuiFlexItem style={{}}>
          {comparison
            ? i18n.translate('xpack.profiling.flameGraphTooltip.valueLabel', {
                defaultMessage: `{value} vs {comparison}`,
                values: {
                  value: valueLabel,
                  comparison: comparisonLabel,
                },
              })
            : valueLabel}
          {diffLabel ? ` (${diffLabel})` : ''}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

function FlameGraphTooltip({
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
            <TooltipRow
              label={i18n.translate('xpack.profiling.flameGraphTooltip.inclusiveCpuLabel', {
                defaultMessage: `Inclusive CPU:`,
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
                defaultMessage: `Exclusive CPU:`,
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
            <TooltipRow
              label={i18n.translate('xpack.profiling.flameGraphTooltip.samplesLabel', {
                defaultMessage: `Samples:`,
              })}
              value={samples}
              comparison={comparisonSamples}
              formatAsPercentage={false}
              showChange={false}
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
    </EuiFlexGroup>
  );
};
