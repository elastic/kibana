/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap } from '@kbn/mapbox-gl';
import { StaticStyleProperty } from './static_style_property';
// TODO Is there a better way to ignore multiline imports?
import {
  // @ts-ignore
  buildSrcUrl,
  // @ts-ignore
  createSdfIcon,
  // @ts-ignore
  getMakiSymbolAnchor,
  // @ts-ignore
  getMakiIconId,
  // @ts-ignore
  CUSTOM_ICON_PREFIX,
  // @ts-ignore
} from '../symbol_utils';
import { IconStaticOptions } from '../../../../../common/descriptor_types';

export class StaticIconProperty extends StaticStyleProperty<IconStaticOptions> {
  syncIconWithMb(symbolLayerId: string, mbMap: MbMap, iconPixelSize: number) {
    const { value: symbolId, icon } = this._options;
    const customIconCheck = () => {
      return new Promise<void>(async (resolve) => {
        if (!mbMap.hasImage(symbolId)) {
          const imageData = await createSdfIcon(icon);
          mbMap.addImage(symbolId, imageData, { pixelRatio: 4, sdf: true });
        }
        resolve();
      });
    };
    if (symbolId.startsWith(CUSTOM_ICON_PREFIX) && icon) {
      customIconCheck().then(() => mbMap.setLayoutProperty(symbolLayerId, 'icon-image', symbolId));
    } else {
      mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', getMakiSymbolAnchor(symbolId));
      mbMap.setLayoutProperty(symbolLayerId, 'icon-image', getMakiIconId(symbolId, iconPixelSize));
    }
  }
}
