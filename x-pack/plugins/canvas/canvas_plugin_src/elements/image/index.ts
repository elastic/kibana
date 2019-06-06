/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementFactory } from '../types';
import header from './header.png';

export const image: ElementFactory = () => ({
  name: 'image',
  displayName: 'Image',
  tags: ['graphic'],
  help: 'A static image',
  image: header,
  expression: `image dataurl=null mode="contain"
| render`,
});
