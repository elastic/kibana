/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { EuiButtonEmpty, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  Chart,
  Settings,
  Axis,
  ScaleType,
  Position,
  BarSeries,
  RecursivePartial,
  AxisStyle,
  PartialTheme,
  BarSeriesSpec,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import euiVars from '@elastic/eui/dist/eui_theme_light.json';

import { Hyperparameter } from '../../../../../../../common/types/trained_models';

import { useMlKibana } from '../../../../../contexts/kibana';

import { ExpandableSection } from '../expandable_section';

const { euiColorMediumShade } = euiVars;
const axisColor = euiColorMediumShade;

const axes: RecursivePartial<AxisStyle> = {
  axisLine: {
    stroke: axisColor,
  },
  tickLabel: {
    fontSize: 12,
    fill: axisColor,
  },
  tickLine: {
    stroke: axisColor,
  },
  gridLine: {
    horizontal: {
      dash: [1, 2],
    },
    vertical: {
      strokeWidth: 0,
    },
  },
};
const theme: PartialTheme = {
  axes,
  legend: {
    /**
     * Added buffer between label and value.
     * Smaller values render a more compact legend
     */
    spacingBuffer: 100,
  },
};

export interface HyperparametersSummaryPanelProps {
  hyperparameters: Hyperparameter[];
}

const tooltipContent = i18n.translate(
  'xpack.ml.dataframe.analytics.exploration.hyperparametersSummaryTooltipContent',
  {
    defaultMessage:
      'Hyperparameter importance values indicate how significantly a hyperparameter affects the predictions across all the training data.',
  }
);

export const HyperparametersSummaryPanel: FC<HyperparametersSummaryPanelProps> = ({
  hyperparameters,
}) => {
  const {
    services: { docLinks },
  } = useMlKibana();

  const [plotData, barSeriesSpec, chartHeight] = useMemo(() => {
    let sortedData: Array<{
      name: string;
      importance: number;
    }> = [];
    const _barSeriesSpec: Partial<BarSeriesSpec> = {
      xAccessor: 'name',
      yAccessors: ['importance'],
      name: i18n.translate('xpack.ml.dataframe.analytics.exploration.hyperparametersYSeriesName', {
        defaultMessage: 'importance',
      }) as string,
    };
    if (hyperparameters.length < 1) {
      return [sortedData, _barSeriesSpec];
    }

    sortedData = hyperparameters
      .map((d) => {
        return {
          name: d.name,
          importance: d.absolute_importance,
        };
      })
      .sort((a, b) => b.importance - a.importance);

    const _chartHeight = hyperparameters.length * (hyperparameters.length < 5 ? 40 : 20) + 50;
    return [sortedData, _barSeriesSpec, _chartHeight];
  }, [hyperparameters]);

  const docLink = docLinks.links.ml.hyperparameters;
  const tickFormatter = useCallback((d) => Number(d.toPrecision(3)).toString(), []);

  // do not expand by default if no hyperparameters importance data
  const noDataCallOut = useMemo(() => {
    // if no total hyperparameters importance data
    if (hyperparameters.every((d) => d.absolute_importance === 0)) {
      return (
        <EuiCallOut
          data-test-subj="mlNoHyperparametersImportanceCallout"
          size="s"
          title={
            <FormattedMessage
              id="xpack.ml.dataframe.analytics.exploration.noHyperparametersCalloutMessage"
              defaultMessage="Hyperparameters data is not available; the data set is uniform and the importance has no significant impact on the prediction."
            />
          }
        />
      );
    }
  }, [hyperparameters]);

  return (
    <>
      <ExpandableSection
        urlStateKey={'hyperparameter_importance'}
        isExpanded={noDataCallOut === undefined}
        dataTestId="HyperparametersSummary"
        title={
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.exploration.hyperparametersSummaryTitle"
            defaultMessage="Hyperparameters importance"
          />
        }
        docsLink={
          <EuiButtonEmpty
            target="_blank"
            iconType="help"
            iconSide="left"
            color="primary"
            href={docLink}
          >
            <FormattedMessage
              id="xpack.ml.dataframe.analytics.exploration.hyperparametersDocsLink"
              defaultMessage="Hyperparameters docs"
            />
          </EuiButtonEmpty>
        }
        headerItems={[
          {
            id: 'HyperparametersSummary',
            value: tooltipContent,
          },
        ]}
        content={
          noDataCallOut ? (
            noDataCallOut
          ) : (
            <div data-test-subj="mlHyperparametersImportanceChart">
              <Chart
                size={{
                  width: '100%',
                  height: chartHeight,
                }}
              >
                <Settings rotation={90} theme={theme} showLegend={false} />

                <Axis
                  id="x-axis"
                  title={i18n.translate(
                    'xpack.ml.dataframe.analytics.exploration.hyperparametersXAxisTitle',
                    {
                      defaultMessage: 'Hyperparameter importance',
                    }
                  )}
                  position={Position.Bottom}
                  tickFormat={tickFormatter}
                />
                <Axis id="y-axis" title="" position={Position.Left} />
                <BarSeries
                  id="importance"
                  xScaleType={ScaleType.Ordinal}
                  yScaleType={ScaleType.Linear}
                  data={plotData}
                  {...barSeriesSpec}
                />
              </Chart>
            </div>
          )
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};
