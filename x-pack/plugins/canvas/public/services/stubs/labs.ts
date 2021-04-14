/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { projectIDs } from '../../../../../../src/plugins/presentation_util/public';
import { CanvasLabsService } from '../labs';

const noop = (..._args: any[]): any => {};

export const labsService: CanvasLabsService = {
  getProject: noop,
  getProjects: noop,
  getProjectIDs: () => projectIDs,
  isLabsEnabled: () => true,
  projectIDs,
  reset: noop,
  setProjectStatus: noop,
};
