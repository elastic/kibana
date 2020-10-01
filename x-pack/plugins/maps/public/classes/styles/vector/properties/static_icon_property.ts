/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Map as MbMap } from 'mapbox-gl';
import { StaticStyleProperty } from './static_style_property';
// @ts-expect-error
import { getMakiSymbolAnchor, getMakiIconId } from '../symbol_utils';
import { IconStaticOptions } from '../../../../../common/descriptor_types';

export class StaticIconProperty extends StaticStyleProperty<IconStaticOptions> {
  syncIconWithMb(symbolLayerId: string, mbMap: MbMap, iconPixelSize: number) {
    const symbolId = this._options.value;
    mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', getMakiSymbolAnchor(symbolId));
    mbMap.setLayoutProperty(symbolLayerId, 'icon-image', getMakiIconId(symbolId, iconPixelSize));
  }
}
