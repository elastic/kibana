/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { AbstractStyleProperty } from './style_property';
import { LabelVisibilityStylePropertyDescriptor } from '../../../../../common/descriptor_types';
import { VECTOR_STYLES } from '../../../../../common/constants';

export class LabelVisibilityProperty extends AbstractStyleProperty<LabelVisibilityStylePropertyDescriptor[options]> {
  constructor(
    options: LabelVisibilityStylePropertyDescriptor[options],
    styleName: VECTOR_STYLES,
  ) {
    super(options, styleName);
  }
}
