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
import { createSdfIcon, CUSTOM_ICON_PREFIX, getIconPalette, getMakiIconId, getMakiSymbolAnchor } from '../symbol_utils';
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
      this._getMbIconImageExpression(iconPixelSize, mbMap).then((expr) => {
        mbMap.setLayoutProperty(
          symbolLayerId,
          'icon-image',
          expr
        );
      });
      mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', this._getMbIconAnchorExpression());
    } else {
      mbMap.setLayoutProperty(symbolLayerId, 'icon-image', null);
      mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', null);
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

  async _getMbIconImageExpression(iconPixelSize: number, mbMap: MbMap) {
    const { stops, fallbackSymbolId } = this._getPaletteStops();

    if (stops.length < 1 || !fallbackSymbolId) {
      // occurs when no data
      return null;
    }

    const mbStops = [];
    const addIconsToMap: Promise<void>[] = [];
    stops.forEach(({ stop, style, svg }) => {
      mbStops.push(`${stop}`);
      if (style.startsWith(CUSTOM_ICON_PREFIX) && svg) {
        addIconsToMap.push(this._customIconCheck(style, svg, mbMap));
        mbStops.push(style);
      } else {
        mbStops.push(getMakiIconId(style, iconPixelSize));
      }
    });

    await Promise.all(addIconsToMap);

    if (fallbackSymbolId) {
      mbStops.push(getMakiIconId(fallbackSymbolId, iconPixelSize)); // last item is fallback style for anything that does not match provided stops
    }
    return ['match', ['to-string', ['get', this.getFieldName()]], ...mbStops];
  }

  _getMbIconAnchorExpression() {
    const { stops, fallbackSymbolId } = this._getPaletteStops();

    if (stops.length < 1 || !fallbackSymbolId) {
      // occurs when no data
      return null;
    }

    const mbStops = [];
    stops.forEach(({ stop, style }) => {
      mbStops.push(`${stop}`);
      mbStops.push(getMakiSymbolAnchor(style));
    });

    if (fallbackSymbolId) {
      mbStops.push(getMakiSymbolAnchor(fallbackSymbolId)); // last item is fallback style for anything that does not match provided stops
    }
    return ['match', ['to-string', ['get', this.getFieldName()]], ...mbStops];
  }

  _isIconDynamicConfigComplete() {
    return this._field && this._field.isValid();
  }

  renderLegendDetailRow({ isPointsOnly, isLinesOnly }: LegendProps) {
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
