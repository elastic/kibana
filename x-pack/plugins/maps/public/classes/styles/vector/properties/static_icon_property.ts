/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Map as MbMap } from '@kbn/mapbox-gl';
import type { IconStaticOptions } from '../../../../../common/descriptor_types/style_property_descriptor_types';
// @ts-expect-error
import { getMakiIconId, getMakiSymbolAnchor } from '../symbol_utils';
import { StaticStyleProperty } from './static_style_property';

export class StaticIconProperty extends StaticStyleProperty<IconStaticOptions> {
  syncIconWithMb(symbolLayerId: string, mbMap: MbMap, iconPixelSize: number) {
    const symbolId = this._options.value;
    mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', getMakiSymbolAnchor(symbolId));
    mbMap.setLayoutProperty(symbolLayerId, 'icon-image', getMakiIconId(symbolId, iconPixelSize));
  }
}
