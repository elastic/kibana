/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { SOURCE_TYPES } from '../../../../common/constants';
import { registerSource } from '../source_registry';
import { AbstractSource } from '../source';

export const sourceTitle = i18n.translate('xpack.maps.source.vegaTitle', {
  defaultMessage: 'Vega layer',
});

export class VegaSource extends AbstractSource {
  static type = SOURCE_TYPES.VEGA;

  static createDescriptor() {
    return {
      type: VegaSource.type,
    };
  }

  constructor() {
    super({
      type: VegaSource.type,
    });
  }

  async getDisplayName() {
    return 'Vega test layer';
  }
}

registerSource({
  ConstructorFunction: VegaSource,
  type: SOURCE_TYPES.VEGA,
});
