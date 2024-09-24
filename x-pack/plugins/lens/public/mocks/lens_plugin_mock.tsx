/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createFormulaPublicApi } from '../async_services';
import { LensPublicStart } from '..';
import { visualizationSubtypes } from '../visualizations/xy/types';
import { mockAllSuggestions } from './suggestions_mock';

type Start = jest.Mocked<LensPublicStart>;

export const lensPluginMock = {
  createStartContract: (): Start => {
    const startContract: Start = {
      EmbeddableComponent: jest.fn(() => {
        return <span>Lens Embeddable Component</span>;
      }),
      SaveModalComponent: jest.fn(() => {
        return <span>Lens Save Modal Component</span>;
      }),
      EditLensConfigPanelApi: jest
        .fn()
        .mockResolvedValue(() => <span>Lens Config Panel Component</span>),
      canUseEditor: jest.fn(() => true),
      navigateToPrefilledEditor: jest.fn(),
      getXyVisTypes: jest
        .fn()
        .mockReturnValue(new Promise((resolve) => resolve(visualizationSubtypes))),

      stateHelperApi: jest.fn().mockResolvedValue({
        formula: createFormulaPublicApi(),
        suggestions: jest.fn().mockReturnValue(mockAllSuggestions),
      }),
    };
    return startContract;
  },
};
