/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Process } from '../types/process_tree';

export const sortProcesses = (a: Process, b: Process) => {
  const eventA = a.getDetails();
  const eventB = b.getDetails();

  if (eventA.process.start < eventB.process.start) {
    return -1;
  }

  if (eventA.process.start > eventB.process.start) {
    return 1;
  }

  return 0;
};
