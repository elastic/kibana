/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  projectIDs,
  PresentationLabsService,
} from '../../../../../src/plugins/presentation_util/public';

import { CanvasServiceFactory } from '.';
import { UI_SETTINGS } from '../../common';
export interface CanvasLabsService extends PresentationLabsService {
  projectIDs: typeof projectIDs;
  isLabsEnabled: () => boolean;
}

export const labsServiceFactory: CanvasServiceFactory<CanvasLabsService> = async (
  _coreSetup,
  coreStart,
  _setupPlugins,
  startPlugins
) => ({
  projectIDs,
  isLabsEnabled: () => coreStart.uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI),
  ...startPlugins.presentationUtil.labsService,
});
