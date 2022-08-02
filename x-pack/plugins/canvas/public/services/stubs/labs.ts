/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginServiceFactory, projectIDs } from '@kbn/presentation-util-plugin/public';
import { CanvasLabsService } from '../labs';

type CanvasLabsServiceFactory = PluginServiceFactory<CanvasLabsService>;

const noop = (..._args: any[]): any => {};

export const labsServiceFactory: CanvasLabsServiceFactory = () => ({
  getProject: noop,
  getProjects: noop,
  getProjectIDs: () => projectIDs,
  isProjectEnabled: () => false,
  isLabsEnabled: () => true,
  projectIDs,
  reset: noop,
  setProjectStatus: noop,
});
