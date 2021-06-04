/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkpadService } from '../workpad';
import { CanvasWorkpad } from '../../../types';

export const workpadService: WorkpadService = {
  get: (id: string) => Promise.resolve({} as CanvasWorkpad),
  create: (workpad) => Promise.resolve({} as CanvasWorkpad),
  createFromTemplate: (templateId: string) => Promise.resolve({} as CanvasWorkpad),
  find: (term: string) =>
    Promise.resolve({
      total: 0,
      workpads: [],
    }),
  remove: (id: string) => Promise.resolve(undefined),
};
