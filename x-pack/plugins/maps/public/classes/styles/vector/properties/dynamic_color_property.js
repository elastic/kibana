/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicStyleProperty } from './dynamic_style_property';
import { makeMbClampedNumberExpression, dynamicRound } from '../style_util';
import {
  getOrdinalMbColorRampStops,
  getColorPalette,
  getHexColorRangeStrings,
  GRADIENT_INTERVALS,
} from '../../color_utils';
import React from 'react';
import { COLOR_MAP_TYPE, MB_LOOKUP_FUNCTION } from '../../../../../common/constants';
import {
  isCategoricalStopsInvalid,
  getOtherCategoryLabel,
} from '../components/color/color_stops_utils';
import { BreakedLegend } from '../components/legend/breaked_legend';
import { EuiTextColor } from '@elastic/eui';

const EMPTY_STOPS = { stops: [], defaultColor: null };
const RGBA_0000 = 'rgba(0,0,0,0)';

export class DynamicColorProperty extends DynamicStyleProperty {
  syncCircleColorWithMb(mbLayerId, mbMap, alpha) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'circle-color', color);
    mbMap.setPaintProperty(mbLayerId, 'circle-opacity', alpha);
  }

  syncIconColorWithMb(mbLayerId, mbMap) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'icon-color', color);
  }

  syncHaloBorderColorWithMb(mbLayerId, mbMap) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'icon-halo-color', color);
  }

  syncCircleStrokeWithMb(pointLayerId, mbMap, alpha) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(pointLayerId, 'circle-stroke-color', color);
    mbMap.setPaintProperty(pointLayerId, 'circle-stroke-opacity', alpha);
  }

  syncFillColorWithMb(mbLayerId, mbMap, alpha) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'fill-color', color);
    mbMap.setPaintProperty(mbLayerId, 'fill-opacity', alpha);
  }

  syncLineColorWithMb(mbLayerId, mbMap, alpha) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'line-color', color);
    mbMap.setPaintProperty(mbLayerId, 'line-opacity', alpha);
  }

  syncLabelColorWithMb(mbLayerId, mbMap, alpha) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'text-color', color);
    mbMap.setPaintProperty(mbLayerId, 'text-opacity', alpha);
  }

  syncLabelBorderColorWithMb(mbLayerId, mbMap) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'text-halo-color', color);
  }

  supportsFieldMeta() {
    if (!this.isComplete() || !this._field.supportsFieldMeta()) {
      return false;
    }

    return (
      (this.isCategorical() && !this._options.useCustomColorPalette) ||
      (this.isOrdinal() && !this._options.useCustomColorRamp)
    );
  }

  isOrdinal() {
    return (
      typeof this._options.type === 'undefined' || this._options.type === COLOR_MAP_TYPE.ORDINAL
    );
  }

  isCategorical() {
    return this._options.type === COLOR_MAP_TYPE.CATEGORICAL;
  }

  getNumberOfCategories() {
    const colors = getColorPalette(this._options.colorCategory);
    return colors ? colors.length : 0;
  }

  supportsMbFeatureState() {
    return true;
  }

  _getMbColor() {
    if (!this._field || !this._field.getName()) {
      return null;
    }

    return this.isCategorical()
      ? this._getCategoricalColorMbExpression()
      : this._getOrdinalColorMbExpression();
  }

  _getOrdinalColorMbExpression() {
    const targetName = this._field.getName();
    if (this._options.useCustomColorRamp) {
      if (!this._options.customColorRamp || !this._options.customColorRamp.length) {
        // custom color ramp config is not complete
        return null;
      }

      const colorStops = this._options.customColorRamp.reduce((accumulatedStops, nextStop) => {
        return [...accumulatedStops, nextStop.stop, nextStop.color];
      }, []);
      const firstStopValue = colorStops[0];
      const lessThanFirstStopValue = firstStopValue - 1;
      return [
        'step',
        ['coalesce', ['feature-state', targetName], lessThanFirstStopValue],
        RGBA_0000, // MB will assign the base value to any features that is below the first stop value
        ...colorStops,
      ];
    } else {
      const rangeFieldMeta = this.getRangeFieldMeta();
      if (!rangeFieldMeta) {
        return null;
      }

      const colorStops = getOrdinalMbColorRampStops(
        this._options.color,
        rangeFieldMeta.min,
        rangeFieldMeta.max,
        GRADIENT_INTERVALS
      );
      if (!colorStops) {
        return null;
      }

      const lessThanFirstStopValue = rangeFieldMeta.min - 1;
      return [
        'interpolate',
        ['linear'],
        makeMbClampedNumberExpression({
          minValue: rangeFieldMeta.min,
          maxValue: rangeFieldMeta.max,
          lookupFunction: MB_LOOKUP_FUNCTION.FEATURE_STATE,
          fallback: lessThanFirstStopValue,
          fieldName: targetName,
        }),
        lessThanFirstStopValue,
        RGBA_0000,
        ...colorStops,
      ];
    }
  }

  _getColorPaletteStops() {
    if (this._options.useCustomColorPalette && this._options.customColorPalette) {
      if (isCategoricalStopsInvalid(this._options.customColorPalette)) {
        return EMPTY_STOPS;
      }

      const stops = [];
      for (let i = 1; i < this._options.customColorPalette.length; i++) {
        const config = this._options.customColorPalette[i];
        stops.push({
          stop: config.stop,
          color: config.color,
        });
      }

      return {
        defaultColor: this._options.customColorPalette[0].color,
        stops,
      };
    }

    const fieldMeta = this.getCategoryFieldMeta();
    if (!fieldMeta || !fieldMeta.categories) {
      return EMPTY_STOPS;
    }

    const colors = getColorPalette(this._options.colorCategory);
    if (!colors) {
      return EMPTY_STOPS;
    }

    const maxLength = Math.min(colors.length, fieldMeta.categories.length + 1);
    const stops = [];

    for (let i = 0; i < maxLength - 1; i++) {
      stops.push({
        stop: fieldMeta.categories[i].key,
        color: colors[i],
      });
    }
    return {
      stops,
      defaultColor: colors[maxLength - 1],
    };
  }

  _getCategoricalColorMbExpression() {
    if (
      this._options.useCustomColorPalette &&
      (!this._options.customColorPalette || !this._options.customColorPalette.length)
    ) {
      return null;
    }

    const { stops, defaultColor } = this._getColorPaletteStops();
    if (stops.length < 1) {
      //occurs when no data
      return null;
    }

    if (!defaultColor) {
      return null;
    }

    const mbStops = [];
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const branch = `${stop.stop}`;
      mbStops.push(branch);
      mbStops.push(stop.color);
    }

    mbStops.push(defaultColor); //last color is default color
    return ['match', ['to-string', ['get', this._field.getName()]], ...mbStops];
  }

  _getColorRampStops() {
    if (this._options.useCustomColorRamp && this._options.customColorRamp) {
      return this._options.customColorRamp;
    }

    if (!this._options.color) {
      return [];
    }

    const rangeFieldMeta = this.getRangeFieldMeta();
    if (!rangeFieldMeta) {
      return [];
    }

    const colors = getHexColorRangeStrings(this._options.color, GRADIENT_INTERVALS);

    if (rangeFieldMeta.delta === 0) {
      //map to last color.
      return [
        {
          color: colors[colors.length - 1],
          stop: dynamicRound(rangeFieldMeta.max),
        },
      ];
    }

    return colors.map((color, index) => {
      const rawStopValue = rangeFieldMeta.min + rangeFieldMeta.delta * (index / GRADIENT_INTERVALS);
      return {
        color,
        stop: dynamicRound(rawStopValue),
      };
    });
  }

  _getColorStops() {
    if (this.isOrdinal()) {
      return {
        stops: this._getColorRampStops(),
        defaultColor: null,
      };
    } else if (this.isCategorical()) {
      return this._getColorPaletteStops();
    } else {
      return EMPTY_STOPS;
    }
  }

  renderLegendDetailRow({ isPointsOnly, isLinesOnly, symbolId }) {
    const { stops, defaultColor } = this._getColorStops();
    const breaks = [];
    stops.forEach(({ stop, color }) => {
      if (stop) {
        breaks.push({
          color,
          symbolId,
          label: this.formatField(stop),
        });
      }
    });
    if (defaultColor) {
      breaks.push({
        color: defaultColor,
        label: <EuiTextColor color="secondary">{getOtherCategoryLabel()}</EuiTextColor>,
        symbolId,
      });
    }

    return (
      <BreakedLegend
        style={this}
        breaks={breaks}
        isPointsOnly={isPointsOnly}
        isLinesOnly={isLinesOnly}
      />
    );
  }
}
