/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { LensPluginStartDependencies } from '../../../plugin';
import { createMockStartDependencies } from '../../../editor_frame_service/mocks';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import { EditLensEmbeddableAction } from './in_app_embeddable_edit_action';

describe('inapp editing of Lens embeddable', () => {
  const core = coreMock.createStart();
  const mockStartDependencies =
    createMockStartDependencies() as unknown as LensPluginStartDependencies;
  describe('compatibility check', () => {
    const attributes = {
      title: 'An extremely cool default document!',
      expression: 'definitely a valid expression',
      visualizationType: 'testVis',
      state: {
        query: { esql: 'from test' },
        filters: [{ query: { match_phrase: { src: 'test' } }, meta: { index: 'index-pattern-0' } }],
        datasourceStates: {
          testDatasource: 'datasource',
        },
        visualization: {},
      },
      references: [{ type: 'index-pattern', id: '1', name: 'index-pattern-0' }],
    } as unknown as TypedLensByValueInput['attributes'];
    it('is incompatible for ESQL charts and if ui setting for ES|QL is off', async () => {
      const inAppEditAction = new EditLensEmbeddableAction(mockStartDependencies, core);
      const context = {
        attributes,
        lensEvent: {
          adapters: {},
          embeddableOutput$: undefined,
        },
        onUpdate: jest.fn(),
      };
      const isCompatible = await inAppEditAction.isCompatible(context);

      expect(isCompatible).toBeFalsy();
    });

    it('is compatible for ESQL charts and if ui setting for ES|QL is on', async () => {
      const updatedCore = {
        ...core,
        uiSettings: {
          ...core.uiSettings,
          get: (setting: string) => {
            return setting === 'discover:enableESQL';
          },
        },
      } as CoreStart;
      const inAppEditAction = new EditLensEmbeddableAction(mockStartDependencies, updatedCore);
      const context = {
        attributes,
        lensEvent: {
          adapters: {},
          embeddableOutput$: undefined,
        },
        onUpdate: jest.fn(),
      };
      const isCompatible = await inAppEditAction.isCompatible(context);

      expect(isCompatible).toBeTruthy();
    });

    it('is compatible for dataview charts', async () => {
      const inAppEditAction = new EditLensEmbeddableAction(mockStartDependencies, core);
      const newAttributes = {
        ...attributes,
        state: {
          ...attributes.state,
          query: {
            language: 'kuery',
            query: '',
          },
        },
      };
      const context = {
        attributes: newAttributes,
        lensEvent: {
          adapters: {},
          embeddableOutput$: undefined,
        },
        onUpdate: jest.fn(),
      };
      const isCompatible = await inAppEditAction.isCompatible(context);

      expect(isCompatible).toBeTruthy();
    });
  });
});
