/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Process } from '../types/process_tree';

export const sortProcesses = (a: Process, b: Process) => {
  const eventAStartTime = a.getDetails()?.process?.start || 0;
  const eventBStartTime = b.getDetails()?.process?.start || 0;

  if (eventAStartTime < eventBStartTime) {
    return -1;
  }

  if (eventAStartTime > eventBStartTime) {
    return 1;
  }

  return 0;
};
