/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';

export const createMlStartDepsMock = () => ({
  data: dataPluginMock.createStartContract(),
  share: sharePluginMock.createStartContract(),
  uiActions: uiActionsPluginMock.createStartContract(),
  spaces: jest.fn(),
  embeddable: embeddablePluginMock.createStartContract(),
  maps: jest.fn(),
  triggersActionsUi: triggersActionsUiMock.createStart(),
  dataVisualizer: jest.fn(),
});
