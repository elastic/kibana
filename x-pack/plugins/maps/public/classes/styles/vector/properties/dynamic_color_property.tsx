/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap } from '@kbn/mapbox-gl';
import React from 'react';
import { EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DynamicStyleProperty } from './dynamic_style_property';
import { makeMbClampedNumberExpression, dynamicRound } from '../style_util';
import {
  getOrdinalMbColorRampStops,
  getPercentilesMbColorRampStops,
  getColorPalette,
} from '../../color_palettes';
import {
  COLOR_MAP_TYPE,
  DATA_MAPPING_FUNCTION,
  FieldFormatter,
  VECTOR_STYLES,
} from '../../../../../common/constants';
import {
  isCategoricalStopsInvalid,
  getOtherCategoryLabel,
  // @ts-expect-error
} from '../components/color/color_stops_utils';
import { Break, BreakedLegend } from '../components/legend/breaked_legend';
import { ColorDynamicOptions, OrdinalColorStop } from '../../../../../common/descriptor_types';
import { LegendProps } from './style_property';
import { getOrdinalSuffix } from '../../../util/ordinal_suffix';
import { IField } from '../../../fields/field';
import { IVectorLayer } from '../../../layers/vector_layer/vector_layer';

const UP_TO = i18n.translate('xpack.maps.legend.upto', {
  defaultMessage: 'up to',
});
const EMPTY_STOPS = { stops: [], defaultColor: null };
const RGBA_0000 = 'rgba(0,0,0,0)';

export class DynamicColorProperty extends DynamicStyleProperty<ColorDynamicOptions> {
  private readonly _chartsPaletteServiceGetColor?: (value: string) => string | null;

  constructor(
    options: ColorDynamicOptions,
    styleName: VECTOR_STYLES,
    field: IField | null,
    vectorLayer: IVectorLayer,
    getFieldFormatter: (fieldName: string) => null | FieldFormatter,
    chartsPaletteServiceGetColor?: (value: string) => string | null
  ) {
    super(options, styleName, field, vectorLayer, getFieldFormatter);
    this._chartsPaletteServiceGetColor = chartsPaletteServiceGetColor;
  }

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
    if (!this.isComplete() || !this._field || !this._field.supportsFieldMetaFromEs()) {
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

  _getSupportedDataMappingFunctions(): DATA_MAPPING_FUNCTION[] {
    return [DATA_MAPPING_FUNCTION.INTERPOLATE, DATA_MAPPING_FUNCTION.PERCENTILES];
  }

  _getMbColor() {
    if (!this.getMbFieldName()) {
      return null;
    }

    return this.isCategorical()
      ? this._getCategoricalColorMbExpression()
      : this._getOrdinalColorMbExpression();
  }

  _getOrdinalColorMbExpression() {
    const targetName = this.getMbFieldName();
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
      return [
        'step',
        makeMbClampedNumberExpression({
          minValue: colorStops[0] as number,
          maxValue: colorStops[colorStops.length - 2] as number,
          lookupFunction: this.getMbLookupFunction(),
          fallback: (colorStops[0] as number) - 1,
          fieldName: targetName,
        }),
        RGBA_0000, // MB will assign the base value to any features that is below the first stop value
        ...colorStops,
      ];
    }

    if (this.getDataMappingFunction() === DATA_MAPPING_FUNCTION.PERCENTILES) {
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

      return [
        'step',
        makeMbClampedNumberExpression({
          minValue: colorStops[0] as number,
          maxValue: colorStops[colorStops.length - 2] as number,
          lookupFunction: this.getMbLookupFunction(),
          fallback: (colorStops[0] as number) - 1,
          fieldName: targetName,
        }),
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

  _getCustomRampColorStops(): Array<number | string> {
    return this._options.customColorRamp
      ? this._options.customColorRamp.reduce(
          (accumulatedStops: Array<number | string>, nextStop: OrdinalColorStop) => {
            return [...accumulatedStops, nextStop.stop, nextStop.color];
          },
          []
        )
      : [];
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

    const categories = this.getCategoryFieldMeta();
    if (categories.length === 0) {
      return EMPTY_STOPS;
    }

    const colors = this._options.colorCategory
      ? getColorPalette(this._options.colorCategory)
      : null;
    if (!colors) {
      return EMPTY_STOPS;
    }

    const maxLength = Math.min(colors.length, categories.length + 1);
    const stops = [];

    for (let i = 0; i < maxLength - 1; i++) {
      stops.push({
        stop: categories[i].key,
        color: this._chartsPaletteServiceGetColor
          ? this._chartsPaletteServiceGetColor(categories[i].key)
          : colors[i],
      });
    }
    return {
      stops,
      defaultColor: this._chartsPaletteServiceGetColor
        ? this._chartsPaletteServiceGetColor('__other__')
        : colors[maxLength - 1],
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
    return ['match', ['to-string', ['get', this.getMbFieldName()]], ...mbStops];
  }

  _getOrdinalBreaks(symbolId?: string, svg?: string): Break[] {
    let colorStops: Array<number | string> | null = null;
    let getValuePrefix: ((i: number, isNext: boolean) => string) | null = null;
    if (this._options.useCustomColorRamp) {
      if (!this._options.customColorRamp) {
        return [];
      }
      colorStops = this._getCustomRampColorStops();
    } else if (this.getDataMappingFunction() === DATA_MAPPING_FUNCTION.PERCENTILES) {
      const percentilesFieldMeta = this.getPercentilesFieldMeta();
      if (!percentilesFieldMeta) {
        return [];
      }
      colorStops = getPercentilesMbColorRampStops(
        this._options.color ? this._options.color : null,
        percentilesFieldMeta
      );
      getValuePrefix = function (i: number, isNext: boolean) {
        const percentile = isNext
          ? parseFloat(percentilesFieldMeta[i / 2 + 1].percentile)
          : parseFloat(percentilesFieldMeta[i / 2].percentile);

        return `${percentile}${getOrdinalSuffix(percentile)}: `;
      };
    } else {
      const rangeFieldMeta = this.getRangeFieldMeta();
      if (!rangeFieldMeta || !this._options.color) {
        return [];
      }
      if (rangeFieldMeta.delta === 0) {
        const colors = getColorPalette(this._options.color);
        // map to last color.
        return [
          {
            color: colors[colors.length - 1],
            label: this.formatField(dynamicRound(rangeFieldMeta.max)),
            symbolId,
            svg,
          },
        ];
      }
      colorStops = getOrdinalMbColorRampStops(
        this._options.color ? this._options.color : null,
        rangeFieldMeta.min,
        rangeFieldMeta.max
      );
    }

    if (!colorStops || colorStops.length <= 2) {
      return [];
    }

    const breaks = [];
    const lastStopIndex = colorStops.length - 2;
    for (let i = 0; i < colorStops.length; i += 2) {
      const hasNext = i < lastStopIndex;
      const stopValue = colorStops[i];
      const formattedStopValue = this.formatField(dynamicRound(stopValue));
      const color = colorStops[i + 1] as string;
      const valuePrefix = getValuePrefix ? getValuePrefix(i, false) : '';

      let label = '';
      if (!hasNext) {
        label = `>= ${valuePrefix}${formattedStopValue}`;
      } else {
        const nextStopValue = colorStops[i + 2];
        const formattedNextStopValue = this.formatField(dynamicRound(nextStopValue));
        const nextValuePrefix = getValuePrefix ? getValuePrefix(i, true) : '';

        if (i === 0) {
          label = `< ${nextValuePrefix}${formattedNextStopValue}`;
        } else {
          const begin = `${valuePrefix}${formattedStopValue}`;
          const end = `${nextValuePrefix}${formattedNextStopValue}`;
          label = `${begin} ${UP_TO} ${end}`;
        }
      }

      breaks.push({
        color,
        label,
        symbolId,
        svg,
      });
    }
    return breaks;
  }

  _getCategoricalBreaks(symbolId?: string, svg?: string): Break[] {
    const breaks: Break[] = [];
    const { stops, defaultColor } = this._getColorPaletteStops();
    stops.forEach(({ stop, color }: { stop: string | number | null; color: string | null }) => {
      if (stop !== null && color != null) {
        breaks.push({
          color,
          svg,
          symbolId,
          label: this.formatField(stop),
        });
      }
    });
    if (defaultColor) {
      breaks.push({
        color: defaultColor,
        label: <EuiTextColor color="success">{getOtherCategoryLabel()}</EuiTextColor>,
        symbolId,
        svg,
      });
    }
    return breaks;
  }

  renderLegendDetailRow({ isPointsOnly, isLinesOnly, symbolId, svg }: LegendProps) {
    let breaks: Break[] = [];
    if (this.isOrdinal()) {
      breaks = this._getOrdinalBreaks(symbolId, svg);
    } else if (this.isCategorical()) {
      breaks = this._getCategoricalBreaks(symbolId, svg);
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
