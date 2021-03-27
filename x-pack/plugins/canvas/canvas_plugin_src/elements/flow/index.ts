/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElementFactory } from '../../../types';

export const flow: ElementFactory = () => ({
  name: 'flow',
  displayName: 'Flow',
  type: 'flow',
  help: 'A flow element',
  width: 256,
  height: 256,
  icon: 'indexMapping',
  expression:
    'flow "square" fill="#fafafa" border="rgb(64,64,64)" borderWidth=0.5 maintainAspect=false | render',
});
