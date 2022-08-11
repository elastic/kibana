/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaPluginServiceFactory, projectIDs } from '@kbn/presentation-util-plugin/public';
import { UI_SETTINGS } from '../../../common';
import { CanvasStartDeps } from '../../plugin';
import { CanvasLabsService } from '../labs';

export type CanvasLabsServiceFactory = KibanaPluginServiceFactory<
  CanvasLabsService,
  CanvasStartDeps
>;

export const labsServiceFactory: CanvasLabsServiceFactory = ({ startPlugins, coreStart }) => ({
  projectIDs,
  isLabsEnabled: () => coreStart.uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI),
  ...startPlugins.presentationUtil.labsService,
});
