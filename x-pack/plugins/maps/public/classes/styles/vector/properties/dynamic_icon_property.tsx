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
import {
  getIconPalette,
  getMakiSymbolAnchor,
  // @ts-expect-error
} from '../symbol_utils';
import { BreakedLegend } from '../components/legend/breaked_legend';
import { getOtherCategoryLabel, assignCategoriesToIcons } from '../style_util';
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

  syncIconWithMb(symbolLayerId: string, mbMap: MbMap) {
    if (this._isIconDynamicConfigComplete()) {
      mbMap.setLayoutProperty(symbolLayerId, 'icon-image', this._getMbIconImageExpression());
      mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', this._getMbIconAnchorExpression());
    } else {
      mbMap.setLayoutProperty(symbolLayerId, 'icon-image', null);
      mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', null);
    }
  }

  _getPaletteStops() {
    if (this._options.useCustomIconMap && this._options.customIconStops) {
      const stops = this._options.customIconStops.slice(1);

      return {
        fallbackSymbol:
          this._options.customIconStops.length > 0 ? this._options.customIconStops[0] : null,
        stops,
      };
    }

    return assignCategoriesToIcons({
      categories: this.getCategoryFieldMeta(),
      iconValues: getIconPalette(this._options.iconPaletteId),
    });
  }

  _getMbIconImageExpression() {
    const { stops, fallbackSymbol } = this._getPaletteStops();

    if (stops.length < 1 || !fallbackSymbol) {
      // occurs when no data
      return null;
    }

    const mbStops = [];
    stops.forEach(({ stop, value }) => {
      mbStops.push(`${stop}`);
      mbStops.push(`${value}`);
    });

    if (fallbackSymbol && 'value' in fallbackSymbol) {
      mbStops.push(fallbackSymbol.value); // last item is fallback style for anything that does not match provided stops
    }
    return ['match', ['to-string', ['get', this.getMbFieldName()]], ...mbStops];
  }

  _getMbIconAnchorExpression() {
    const { stops, fallbackSymbol } = this._getPaletteStops();

    if (stops.length < 1 || !fallbackSymbol) {
      // occurs when no data
      return null;
    }

    const mbStops = [];
    stops.forEach(({ stop, value }) => {
      mbStops.push(`${stop}`);
      mbStops.push(getMakiSymbolAnchor(value));
    });

    if (fallbackSymbol && 'value' in fallbackSymbol) {
      mbStops.push(getMakiSymbolAnchor(fallbackSymbol.value)); // last item is fallback style for anything that does not match provided stops
    }
    return ['match', ['to-string', ['get', this.getMbFieldName()]], ...mbStops];
  }

  _isIconDynamicConfigComplete() {
    return this._field && this._field.isValid();
  }

  renderLegendDetailRow({ isPointsOnly, isLinesOnly }: LegendProps) {
    const { stops, fallbackSymbol } = this._getPaletteStops();
    const breaks = [];
    stops.forEach(({ stop, value, svg }) => {
      if (stop) {
        breaks.push({
          color: 'grey',
          label: this.formatField(stop),
          symbolId: value,
          svg,
        });
      }
    });

    if (fallbackSymbol && 'value' in fallbackSymbol) {
      const { value, svg } = fallbackSymbol;
      breaks.push({
        color: 'grey',
        label: <EuiTextColor color="success">{getOtherCategoryLabel()}</EuiTextColor>,
        symbolId: value,
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
