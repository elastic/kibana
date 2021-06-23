/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiActionsPluginMock } from '../../../../../src/plugins/ui_actions/public/mocks';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { kibanaLegacyPluginMock } from '../../../../../src/plugins/kibana_legacy/public/mocks';
import { embeddablePluginMock } from '../../../../../src/plugins/embeddable/public/mocks';
import { lensPluginMock } from '../../../lens/public/mocks';
import { triggersActionsUiMock } from '../../../triggers_actions_ui/public/mocks';

export const createMlStartDepsMock = () => ({
  data: dataPluginMock.createStartContract(),
  share: {
    urlGenerators: { getUrlGenerator: jest.fn() },
  },
  kibanaLegacy: kibanaLegacyPluginMock.createStartContract(),
  uiActions: uiActionsPluginMock.createStartContract(),
  spaces: jest.fn(),
  embeddable: embeddablePluginMock.createStartContract(),
  maps: jest.fn(),
  lens: lensPluginMock.createStartContract(),
  triggersActionsUi: triggersActionsUiMock.createStart(),
  dataVisualizer: jest.fn(),
});
