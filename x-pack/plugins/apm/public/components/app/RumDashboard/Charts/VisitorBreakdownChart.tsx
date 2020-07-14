/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  Chart,
  DARK_THEME,
  Datum,
  LIGHT_THEME,
  Partition,
  PartitionLayout,
  Settings,
} from '@elastic/charts';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import {
  EUI_CHARTS_THEME_DARK,
  EUI_CHARTS_THEME_LIGHT,
} from '@elastic/eui/dist/eui_charts_theme';
import { useUiSetting$ } from '../../../../../../../../src/plugins/kibana_react/public';
import { ChartWrapper } from '../ChartWrapper';

interface Props {
  options?: Array<{
    count: number;
    name: string;
  }>;
}

export const VisitorBreakdownChart = ({ options }: Props) => {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return (
    <ChartWrapper loading={false} height="220px">
      <Chart>
        <Settings
          baseTheme={darkMode ? DARK_THEME : LIGHT_THEME}
          theme={
            darkMode
              ? EUI_CHARTS_THEME_DARK.theme
              : EUI_CHARTS_THEME_LIGHT.theme
          }
        />
        <Partition
          id="spec_1"
          data={options || []}
          valueAccessor={(d: Datum) => d.count as number}
          valueGetter="percent"
          percentFormatter={(d: number) =>
            `${Math.round((d + Number.EPSILON) * 100) / 100}%`
          }
          layers={[
            {
              groupByRollup: (d: Datum) => d.name,
              nodeLabel: (d: Datum) => d,
              // fillLabel: { textInvertible: true },
              shape: {
                fillColor: (d) => {
                  const clrs = [
                    euiLightVars.euiColorVis1_behindText,
                    euiLightVars.euiColorVis0_behindText,
                    euiLightVars.euiColorVis2_behindText,
                    euiLightVars.euiColorVis3_behindText,
                    euiLightVars.euiColorVis4_behindText,
                    euiLightVars.euiColorVis5_behindText,
                    euiLightVars.euiColorVis6_behindText,
                    euiLightVars.euiColorVis7_behindText,
                    euiLightVars.euiColorVis8_behindText,
                    euiLightVars.euiColorVis9_behindText,
                  ];
                  return clrs[d.sortIndex];
                },
              },
            },
          ]}
          config={{
            partitionLayout: PartitionLayout.sunburst,
            linkLabel: {
              maxCount: 32,
              fontSize: 14,
            },
            fontFamily: 'Arial',
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            minFontSize: 1,
            idealFontSizeJump: 1.1,
            outerSizeRatio: 0.9, // - 0.5 * Math.random(),
            emptySizeRatio: 0,
            circlePadding: 4,
          }}
        />
      </Chart>
    </ChartWrapper>
  );
};
