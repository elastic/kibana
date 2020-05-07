/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicStyleProperty } from './dynamic_style_property';
import { getOtherCategoryLabel, makeMbClampedNumberExpression } from '../style_util';
import { getOrdinalColorRampStops, getColorPalette } from '../../color_utils';
import { ColorGradient } from '../../components/color_gradient';
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  EuiTextColor,
} from '@elastic/eui';
import { Category } from '../components/legend/category';
import { COLOR_MAP_TYPE, RGBA_0000 } from '../../../../../common/constants';
import { isCategoricalStopsInvalid } from '../components/color/color_stops_utils';

const EMPTY_STOPS = { stops: [], defaultColor: null };

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

  isOrdinalRanged() {
    return this.isOrdinal() && !this._options.useCustomColorRamp;
  }

  hasOrdinalBreaks() {
    return (this.isOrdinal() && this._options.useCustomColorRamp) || this.isCategorical();
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

      const colorStops = getOrdinalColorRampStops(
        this._options.color,
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
          lookupFunction: 'feature-state',
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
      if (typeof branch === 'string') {
        mbStops.push(branch);
        mbStops.push(stop.color);
      }
    }

    mbStops.push(defaultColor); //last color is default color
    return ['match', ['to-string', ['get', this._field.getName()]], ...mbStops];
  }

  renderRangeLegendHeader() {
    if (this._options.color) {
      return <ColorGradient colorRampName={this._options.color} />;
    } else {
      return null;
    }
  }

  _getColorRampStops() {
    return this._options.useCustomColorRamp && this._options.customColorRamp
      ? this._options.customColorRamp
      : [];
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

  renderBreakedLegend({ fieldLabel, isPointsOnly, isLinesOnly, symbolId }) {
    const categories = [];
    const { stops, defaultColor } = this._getColorStops();
    stops.map(({ stop, color }) => {
      categories.push(
        <Category
          key={stop}
          styleName={this.getStyleName()}
          label={this.formatField(stop)}
          color={color}
          isLinesOnly={isLinesOnly}
          isPointsOnly={isPointsOnly}
          symbolId={symbolId}
        />
      );
    });

    if (defaultColor) {
      categories.push(
        <Category
          key="fallbackCategory"
          styleName={this.getStyleName()}
          label={<EuiTextColor color="secondary">{getOtherCategoryLabel()}</EuiTextColor>}
          color={defaultColor}
          isLinesOnly={isLinesOnly}
          isPointsOnly={isPointsOnly}
          symbolId={symbolId}
        />
      );
    }

    return (
      <div>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="none">
          {categories}
        </EuiFlexGroup>
        <EuiFlexGroup gutterSize="xs" justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiToolTip position="top" title={this.getDisplayStyleName()} content={fieldLabel}>
              <EuiText className="eui-textTruncate" size="xs" style={{ maxWidth: '180px' }}>
                <small>
                  <strong>{fieldLabel}</strong>
                </small>
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
}
