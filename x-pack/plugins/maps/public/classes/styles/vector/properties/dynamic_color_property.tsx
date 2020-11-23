/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Map as MbMap } from 'mapbox-gl';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiTextColor } from '@elastic/eui';
import { DynamicStyleProperty } from './dynamic_style_property';
import { makeMbClampedNumberExpression, dynamicRound } from '../style_util';
import {
  getOrdinalMbColorRampStops,
  getPercentilesMbColorRampStops,
  getColorPalette,
} from '../../color_palettes';
import { COLOR_MAP_TYPE, STEP_FUNCTION } from '../../../../../common/constants';
import {
  isCategoricalStopsInvalid,
  getOtherCategoryLabel,
  // @ts-expect-error
} from '../components/color/color_stops_utils';
import { BreakedLegend } from '../components/legend/breaked_legend';
import { ColorDynamicOptions, OrdinalColorStop } from '../../../../../common/descriptor_types';
import { LegendProps } from './style_property';

const EMPTY_STOPS = { stops: [], defaultColor: null };
const RGBA_0000 = 'rgba(0,0,0,0)';

function getOrdinalSuffix(value: number) {
  const lastDigit = value % 10;
  if (lastDigit === 1 && value !== 11) {
    return i18n.translate('xpack.maps.styles.firstOrdinalSuffix', {
      defaultMessage: 'st',
    });
  }

  if (lastDigit === 2 && value !== 12) {
    return i18n.translate('xpack.maps.styles.secondOrdinalSuffix', {
      defaultMessage: 'nd',
    });
  }

  if (lastDigit === 3 && value !== 13) {
    return i18n.translate('xpack.maps.styles.thirdOrdinalSuffix', {
      defaultMessage: 'rd',
    });
  }

  return i18n.translate('xpack.maps.styles.ordinalSuffix', {
    defaultMessage: 'th',
  });
}

export class DynamicColorProperty extends DynamicStyleProperty<ColorDynamicOptions> {
  syncCircleColorWithMb(mbLayerId: string, mbMap: MbMap, alpha: number) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'circle-color', color);
    mbMap.setPaintProperty(mbLayerId, 'circle-opacity', alpha);
  }

  syncIconColorWithMb(mbLayerId: string, mbMap: MbMap) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'icon-color', color);
  }

  syncHaloBorderColorWithMb(mbLayerId: string, mbMap: MbMap) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'icon-halo-color', color);
  }

  syncCircleStrokeWithMb(pointLayerId: string, mbMap: MbMap, alpha: number) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(pointLayerId, 'circle-stroke-color', color);
    mbMap.setPaintProperty(pointLayerId, 'circle-stroke-opacity', alpha);
  }

  syncFillColorWithMb(mbLayerId: string, mbMap: MbMap, alpha: number) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'fill-color', color);
    mbMap.setPaintProperty(mbLayerId, 'fill-opacity', alpha);
  }

  syncLineColorWithMb(mbLayerId: string, mbMap: MbMap, alpha: number) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'line-color', color);
    mbMap.setPaintProperty(mbLayerId, 'line-opacity', alpha);
  }

  syncLabelColorWithMb(mbLayerId: string, mbMap: MbMap, alpha: number) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'text-color', color);
    mbMap.setPaintProperty(mbLayerId, 'text-opacity', alpha);
  }

  syncLabelBorderColorWithMb(mbLayerId: string, mbMap: MbMap) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'text-halo-color', color);
  }

  supportsFieldMeta() {
    if (!this.isComplete() || !this._field || !this._field.supportsFieldMeta()) {
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
    if (!this._options.colorCategory) {
      return 0;
    }

    const colors = getColorPalette(this._options.colorCategory);
    return colors ? colors.length : 0;
  }

  _getMbColor() {
    if (!this.getFieldName()) {
      return null;
    }

    return this.isCategorical()
      ? this._getCategoricalColorMbExpression()
      : this._getOrdinalColorMbExpression();
  }

  _getOrdinalColorMbExpression() {
    const targetName = this.getFieldName();
    if (this._options.useCustomColorRamp) {
      if (!this._options.customColorRamp || !this._options.customColorRamp.length) {
        // custom color ramp config is not complete
        return null;
      }

      const colorStops: Array<number | string> = this._options.customColorRamp.reduce(
        (accumulatedStops: Array<number | string>, nextStop: OrdinalColorStop) => {
          return [...accumulatedStops, nextStop.stop, nextStop.color];
        },
        []
      );
      const firstStopValue = colorStops[0] as number;
      const lessThanFirstStopValue = firstStopValue - 1;
      return [
        'step',
        ['coalesce', [this.getMbLookupFunction(), targetName], lessThanFirstStopValue],
        RGBA_0000, // MB will assign the base value to any features that is below the first stop value
        ...colorStops,
      ];
    }

    if (this.getStepFunction() === STEP_FUNCTION.PERCENTILES) {
      const percentilesFieldMeta = this.getPercentilesFieldMeta();
      if (!percentilesFieldMeta || !percentilesFieldMeta.length) {
        return null;
      }

      const colorStops = getPercentilesMbColorRampStops(
        this._options.color ? this._options.color : null,
        percentilesFieldMeta
      );
      if (!colorStops) {
        return null;
      }

      const lessThanFirstStopValue = percentilesFieldMeta[0].value - 1;
      return [
        'step',
        ['coalesce', [this.getMbLookupFunction(), targetName], lessThanFirstStopValue],
        RGBA_0000,
        ...colorStops,
      ];
    }

    const rangeFieldMeta = this.getRangeFieldMeta();
    if (!rangeFieldMeta) {
      return null;
    }

    const colorStops = getOrdinalMbColorRampStops(
      this._options.color ? this._options.color : null,
      rangeFieldMeta.min,
      rangeFieldMeta.max
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
        lookupFunction: this.getMbLookupFunction(),
        fallback: lessThanFirstStopValue,
        fieldName: targetName,
      }),
      lessThanFirstStopValue,
      RGBA_0000,
      ...colorStops,
    ];
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

    const colors = this._options.colorCategory
      ? getColorPalette(this._options.colorCategory)
      : null;
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
      // occurs when no data
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

    mbStops.push(defaultColor); // last color is default color
    return ['match', ['to-string', ['get', this.getFieldName()]], ...mbStops];
  }

  _getColorRampStops() {
    if (this._options.useCustomColorRamp && this._options.customColorRamp) {
      return this._options.customColorRamp;
    }

    if (this.getStepFunction() === STEP_FUNCTION.PERCENTILES) {
      const percentilesFieldMeta = this.getPercentilesFieldMeta();
      const userDefinedPercentiles = this.getFieldMetaOptions().percentiles;
      if (!percentilesFieldMeta || !userDefinedPercentiles) {
        return [];
      }
      const colorStops = getPercentilesMbColorRampStops(
        this._options.color ? this._options.color : null,
        percentilesFieldMeta
      );
      if (!colorStops || colorStops.length <= 2) {
        return [];
      }

      const colorRampStops = [];
      const indexOfLastStop = colorStops.length - 2;
      for (let i = 0; i < colorStops.length; i += 2) {
        let stop = '';
        if (i === 0) {
          const percentile = userDefinedPercentiles[0];
          stop = `<${percentile}${getOrdinalSuffix(percentile)}: ${this.formatField(
            dynamicRound(colorStops[i + 2])
          )}`;
        } else if (i === indexOfLastStop) {
          const percentile = userDefinedPercentiles[userDefinedPercentiles.length - 1];
          stop = `>${percentile}${getOrdinalSuffix(percentile)}: ${this.formatField(
            dynamicRound(colorStops[i])
          )}`;
        } else {
          const beginPercentile = userDefinedPercentiles[i / 2 - 1];
          const begin = `${beginPercentile}${getOrdinalSuffix(
            beginPercentile
          )}:  ${this.formatField(dynamicRound(colorStops[i]))}`;
          const endPercentile = userDefinedPercentiles[i / 2];
          const end = `${endPercentile}${getOrdinalSuffix(endPercentile)}:  ${this.formatField(
            dynamicRound(colorStops[i + 2])
          )}`;
          stop = `${begin} - ${end}`;
        }

        colorRampStops.push({
          stop,
          color: colorStops[i + 1],
        });
      }
      return colorRampStops;
    }

    if (!this._options.color) {
      return [];
    }

    const rangeFieldMeta = this.getRangeFieldMeta();
    if (!rangeFieldMeta) {
      return [];
    }

    const colors = getColorPalette(this._options.color);

    if (rangeFieldMeta.delta === 0) {
      // map to last color.
      return [
        {
          color: colors[colors.length - 1],
          stop: this.formatField(dynamicRound(rangeFieldMeta.max)),
        },
      ];
    }

    return colors.map((color, index) => {
      const rawStopValue = rangeFieldMeta.min + rangeFieldMeta.delta * (index / colors.length);
      return {
        color,
        stop: this.formatField(dynamicRound(rawStopValue)),
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
      return this._getColorPaletteStops().map((colorStop) => {
        return {
          color: colorStop.color,
          stop: this.formatField(colorStop.stop),
        };
      });
    } else {
      return EMPTY_STOPS;
    }
  }

  renderLegendDetailRow({ isPointsOnly, isLinesOnly, symbolId }: LegendProps) {
    const { stops, defaultColor } = this._getColorStops();
    const breaks = [];
    stops.forEach(({ stop, color }: { stop: string | number | null; color: string }) => {
      if (stop !== null) {
        breaks.push({
          color,
          symbolId,
          label: stop,
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
