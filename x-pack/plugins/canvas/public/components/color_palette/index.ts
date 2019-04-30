/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pure } from 'recompose';
import { ColorPalette as Component } from './color_palette';

export { Props } from './color_palette';
export const ColorPalette = pure(Component);
