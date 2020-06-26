/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { DynamicStyleProperty } from './dynamic_style_property';
import { getIconPalette, getMakiIconId, getMakiSymbolAnchor } from '../symbol_utils';
import { BreakedLegend } from '../components/legend/breaked_legend';
import { getOtherCategoryLabel, assignCategoriesToPalette } from '../style_util';
import { EuiTextColor } from '@elastic/eui';

export class DynamicIconProperty extends DynamicStyleProperty {
  isOrdinal() {
    return false;
  }

  isCategorical() {
    return true;
  }

  getNumberOfCategories() {
    const palette = getIconPalette(this._options.iconPaletteId);
    return palette.length;
  }

  syncIconWithMb(symbolLayerId, mbMap, iconPixelSize) {
    if (this._isIconDynamicConfigComplete()) {
      mbMap.setLayoutProperty(
        symbolLayerId,
        'icon-image',
        this._getMbIconImageExpression(iconPixelSize)
      );
      mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', this._getMbIconAnchorExpression());
    } else {
      mbMap.setLayoutProperty(symbolLayerId, 'icon-image', null);
      mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', null);
    }
  }

  _getPaletteStops() {
    if (this._options.useCustomIconMap && this._options.customIconStops) {
      const stops = [];
      for (let i = 1; i < this._options.customIconStops.length; i++) {
        const { stop, icon } = this._options.customIconStops[i];
        stops.push({
          stop,
          style: icon,
        });
      }

      return {
        fallbackSymbolId:
          this._options.customIconStops.length > 0 ? this._options.customIconStops[0].icon : null,
        stops,
      };
    }

    return assignCategoriesToPalette({
      categories: _.get(this.getCategoryFieldMeta(), 'categories', []),
      paletteValues: getIconPalette(this._options.iconPaletteId),
    });
  }

  _getMbIconImageExpression(iconPixelSize) {
    const { stops, fallbackSymbolId } = this._getPaletteStops();

    if (stops.length < 1 || !fallbackSymbolId) {
      //occurs when no data
      return null;
    }

    const mbStops = [];
    stops.forEach(({ stop, style }) => {
      mbStops.push(`${stop}`);
      mbStops.push(getMakiIconId(style, iconPixelSize));
    });

    if (fallbackSymbolId) {
      mbStops.push(getMakiIconId(fallbackSymbolId, iconPixelSize)); //last item is fallback style for anything that does not match provided stops
    }
    return ['match', ['to-string', ['get', this._field.getName()]], ...mbStops];
  }

  _getMbIconAnchorExpression() {
    const { stops, fallbackSymbolId } = this._getPaletteStops();

    if (stops.length < 1 || !fallbackSymbolId) {
      //occurs when no data
      return null;
    }

    const mbStops = [];
    stops.forEach(({ stop, style }) => {
      mbStops.push(`${stop}`);
      mbStops.push(getMakiSymbolAnchor(style));
    });

    if (fallbackSymbolId) {
      mbStops.push(getMakiSymbolAnchor(fallbackSymbolId)); //last item is fallback style for anything that does not match provided stops
    }
    return ['match', ['to-string', ['get', this._field.getName()]], ...mbStops];
  }

  _isIconDynamicConfigComplete() {
    return this._field && this._field.isValid();
  }

  renderLegendDetailRow({ isPointsOnly, isLinesOnly }) {
    const { stops, fallbackSymbolId } = this._getPaletteStops();
    const breaks = [];
    stops.forEach(({ stop, style }) => {
      if (stop) {
        breaks.push({
          color: 'grey',
          label: this.formatField(stop),
          symbolId: style,
        });
      }
    });

    if (fallbackSymbolId) {
      breaks.push({
        color: 'grey',
        label: <EuiTextColor color="secondary">{getOtherCategoryLabel()}</EuiTextColor>,
        symbolId: fallbackSymbolId,
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
