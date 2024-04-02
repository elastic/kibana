/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { LensPluginStartDependencies } from '../../plugin';
import { createMockStartDependencies } from '../../editor_frame_service/mocks';
import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';
import { CreateESQLPanelAction } from './create_action';

describe('create Lens panel action', () => {
  const core = coreMock.createStart();
  const mockStartDependencies =
    createMockStartDependencies() as unknown as LensPluginStartDependencies;
  const mockPresentationContainer = getMockPresentationContainer();
  describe('compatibility check', () => {
    it('is incompatible if ui setting for ES|QL is off', async () => {
      const configurablePanelAction = new CreateESQLPanelAction(mockStartDependencies, core);
      const isCompatible = await configurablePanelAction.isCompatible({
        embeddable: mockPresentationContainer,
      });

      expect(isCompatible).toBeFalsy();
    });

    it('is compatible if ui setting for ES|QL is on', async () => {
      const updatedCore = {
        ...core,
        uiSettings: {
          ...core.uiSettings,
          get: (setting: string) => {
            return setting === 'discover:enableESQL';
          },
        },
      } as CoreStart;
      const createESQLAction = new CreateESQLPanelAction(mockStartDependencies, updatedCore);
      const isCompatible = await createESQLAction.isCompatible({
        embeddable: mockPresentationContainer,
      });

      expect(isCompatible).toBeTruthy();
    });
  });
});
