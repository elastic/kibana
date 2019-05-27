/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { ColorGradient } from '../../color_gradient';
import { StyleLegendRow } from '../../style_legend_row';

const DEFAULT_RGB_HEATMAP_COLOR_RAMP = [
  'rgb(65, 105, 225)', // royalblue
  'rgb(0, 256, 256)', // cyan
  'rgb(0, 256, 0)', // lime
  'rgb(256, 256, 0)', // yellow
  'rgb(256, 0, 0)', // red
];

const DEFAULT_HEATMAP_COLOR_RAMP_NAME = 'theclassic';

export function HeatmapLegend({ colorRampName, label }) {
  const header = colorRampName === DEFAULT_HEATMAP_COLOR_RAMP_NAME
    ? <ColorGradient colorRamp={DEFAULT_RGB_HEATMAP_COLOR_RAMP}/>
    : <ColorGradient colorRampName={colorRampName}/>;

  return (
    <StyleLegendRow
      header={header}
      minLabel={
        i18n.translate('xpack.maps.heatmapLegend.coldLabel', {
          defaultMessage: 'cold'
        })
      }
      maxLabel={
        i18n.translate('xpack.maps.heatmapLegend.hotLabel', {
          defaultMessage: 'hot'
        })
      }
      propertyLabel={
        i18n.translate('xpack.maps.heatmapLegend.heatmapLabel', {
          defaultMessage: 'heatmap color'
        })
      }
      fieldLabel={label}
    />
  );
}
