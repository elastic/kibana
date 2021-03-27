/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElementFactory } from '../../../types';

export const flowTerminal: ElementFactory = () => ({
  name: 'flowTerminal',
  displayName: 'Flow terminal',
  type: 'flow',
  help: 'A flow terminal element',
  width: 16,
  height: 16,
  icon: 'annotation',
  expression:
    'flow "square" fill="rgb(176, 201, 224)" border="rgb(64,64,64)" borderWidth=0.5 maintainAspect=false | render',
});
