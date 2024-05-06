/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { CanvasStartDeps } from '../../plugin';
import { CanvasUiActionsService } from '../ui_actions';

export type UiActionsServiceFactory = KibanaPluginServiceFactory<
  CanvasUiActionsService,
  CanvasStartDeps
>;

export const uiActionsServiceFactory: UiActionsServiceFactory = ({ startPlugins }) => ({
  getTriggerCompatibleActions: startPlugins.uiActions.getTriggerCompatibleActions,
});
