/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractStyleProperty } from './style_property';
import { SYMBOLIZE_AS_TYPES } from '../../../../../common/constants';

export class SymbolizeAsProperty extends AbstractStyleProperty {
  constructor(options, styleName) {
    super(options, styleName);
  }

  isSymbolizedAsIcon = () => {
    return this.getOptions().value === SYMBOLIZE_AS_TYPES.ICON;
  };
}
