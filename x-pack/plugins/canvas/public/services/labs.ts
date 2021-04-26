/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  projectIDs,
  Project,
  ProjectID,
} from '../../../../../src/plugins/presentation_util/public';

import { CanvasServiceFactory } from '.';

export interface CanvasLabsService {
  getProject: (id: ProjectID) => Project;
  getProjects: () => Record<ProjectID, Project>;
}

export const labsServiceFactory: CanvasServiceFactory<CanvasLabsService> = async (
  _coreSetup,
  _coreStart,
  _setupPlugins,
  startPlugins
) => ({
  projectIDs,
  ...startPlugins.presentationUtil.labsService,
});
