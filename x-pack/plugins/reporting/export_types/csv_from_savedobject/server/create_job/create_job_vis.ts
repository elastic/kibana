/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VisState } from '../../types';

export function createJobVis(visStateJSON: string) {
  const { params: panel, title, type: visType }: VisState = JSON.parse(visStateJSON);
  if (!panel) {
    throw new Error('The saved object contained no panel data!');
  }
  return { panel, title, visType };
}
