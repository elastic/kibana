/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { CanvasUiActionsService } from '../ui_actions';

type UiActionsServiceFactory = PluginServiceFactory<CanvasUiActionsService>;

export const uiActionsServiceFactory: UiActionsServiceFactory = () => {
  const pluginMock = uiActionsPluginMock.createStartContract();
  return { getTriggerCompatibleActions: pluginMock.getTriggerCompatibleActions };
};
