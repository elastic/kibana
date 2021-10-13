/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React from 'react';
import { EuiTextColor } from '@elastic/eui';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import { DynamicStyleProperty } from './dynamic_style_property';
// @ts-expect-error
import { createSdfIcon, CUSTOM_ICON_PREFIX_SDF, getIconPalette, getMakiIconId, getMakiSymbolAnchor } from '../symbol_utils';
import { BreakedLegend } from '../components/legend/breaked_legend';
import { getOtherCategoryLabel, assignCategoriesToPalette } from '../style_util';
import { LegendProps } from './style_property';
import { IconDynamicOptions } from '../../../../../common/descriptor_types';

export class DynamicIconProperty extends DynamicStyleProperty<IconDynamicOptions> {
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

  syncIconWithMb(symbolLayerId: string, mbMap: MbMap, iconPixelSize: number) {
    if (this._isIconDynamicConfigComplete()) {
      this._syncCustomIconsWithMb(mbMap).then(() => {
        mbMap.setLayoutProperty(
          symbolLayerId,
          'icon-image',
          this._getMbIconImageExpression(iconPixelSize)
        );
        mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', this._getMbIconAnchorExpression());
      });
    } else {
      mbMap.setLayoutProperty(symbolLayerId, 'icon-image', null);
      mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', null);
    }
  }

  async _syncCustomIconsWithMb(mbMap: MbMap) {
    if (this._options.useCustomIconMap && this._options.customIconStops) {
      await Promise.all(this._options.customIconStops.map(({ icon, svg }) => {
        if (icon.startsWith(CUSTOM_ICON_PREFIX_SDF) && svg) {
          this._customIconCheck(icon, svg, mbMap)
        }
      }));
    }
  }

  async _customIconCheck(symbolId: string, svg: string, mbMap: MbMap) {
    if (!mbMap.hasImage(symbolId)) {
      const imageData = await createSdfIcon(svg);
      mbMap.addImage(symbolId, imageData, { pixelRatio: 4, sdf: true });
    }
  }

  _getPaletteStops() {
    if (this._options.useCustomIconMap && this._options.customIconStops) {
      const stops = [];
      for (let i = 1; i < this._options.customIconStops.length; i++) {
        const { stop, icon, svg } = this._options.customIconStops[i];
        stops.push({
          stop,
          style: icon,
          svg,
        });
      }

      return {
        stops,
        fallbackSymbol: this._options.customIconStops.length > 0 ? this._options.customIconStops[0] : null,
      };
    }

    return assignCategoriesToPalette({
      categories: _.get(this.getCategoryFieldMeta(), 'categories', []),
      paletteValues: getIconPalette(this._options.iconPaletteId),
    });
  }

  _getMbIconImageExpression(iconPixelSize: number) {
    const { stops, fallbackSymbol } = this._getPaletteStops();

    if (stops.length < 1 || !fallbackSymbol) {
      // occurs when no data
      return null;
    }

    const mbStops = [];
    stops.forEach(({ stop, style }) => {
      mbStops.push(`${stop}`);
      if (style.startsWith(CUSTOM_ICON_PREFIX_SDF)) {
        mbStops.push(style);
      } else {
        mbStops.push(getMakiIconId(style, iconPixelSize));
      }
    });

    if (fallbackSymbol) {
      const { icon } = fallbackSymbol;
      mbStops.push(
        icon.startsWith(CUSTOM_ICON_PREFIX_SDF) ? icon : getMakiIconId(icon, iconPixelSize)
      ); // last item is fallback style for anything that does not match provided stops
    }
    return ['match', ['to-string', ['get', this.getFieldName()]], ...mbStops];
  }

  _getMbIconAnchorExpression() {
    const { stops, fallbackSymbol } = this._getPaletteStops();

    if (stops.length < 1 || !fallbackSymbol) {
      // occurs when no data
      return null;
    }

    const mbStops = [];
    stops.forEach(({ stop, style }) => {
      mbStops.push(`${stop}`);
      if (!style.startsWith(CUSTOM_ICON_PREFIX_SDF)) {
        // then use maki anchor
        mbStops.push(getMakiSymbolAnchor(style));
      }
    });

    const { icon } = fallbackSymbol;

    if (icon && !icon.startsWith(CUSTOM_ICON_PREFIX_SDF)) {
      mbStops.push(getMakiSymbolAnchor(icon)); // last item is fallback style for anything that does not match provided stops
    }
    return ['match', ['to-string', ['get', this.getFieldName()]], ...mbStops];
  }

  _isIconDynamicConfigComplete() {
    return this._field && this._field.isValid();
  }

  renderLegendDetailRow({ isPointsOnly, isLinesOnly }: LegendProps) {
    const { stops, fallbackSymbol } = this._getPaletteStops();
    const breaks = [];
    stops.forEach(({ stop, style, svg }) => {
      if (stop) {
        breaks.push({
          color: 'grey',
          label: this.formatField(stop),
          symbolId: style,
          svg,
        });
      }
    });

    if (fallbackSymbol) {
      const { icon, svg } = fallbackSymbol;
      breaks.push({
        color: 'grey',
        label: <EuiTextColor color="secondary">{getOtherCategoryLabel()}</EuiTextColor>,
        symbolId: icon,
        svg,
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
