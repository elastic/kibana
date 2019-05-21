/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementFactory } from '../types';
import header from './header.png';

export const shape: ElementFactory = () => ({
  name: 'shape',
  displayName: 'Shape',
  tags: ['graphic'],
  help: 'A customizable shape',
  width: 200,
  height: 200,
  image: header,
  expression:
    'shape "square" fill="#4cbce4" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=true | render',
});
