/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractStyle } from '../style';
import { LAYER_STYLE_TYPE } from '../../../../common/constants';

export class TileStyle extends AbstractStyle {
  constructor() {
    super({
      type: LAYER_STYLE_TYPE.TILE,
    });
  }
}
