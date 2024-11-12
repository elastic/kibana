/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultDoc, makeAttributeService } from '../mocks/services_mock';
import { deserializeState } from './helper';

describe('Embeddable helpers', () => {
  describe('deserializeState', () => {
    it('should forward a by value raw state', async () => {
      const attributeService = makeAttributeService(defaultDoc);
      const rawState = {
        attributes: defaultDoc,
      };
      const runtimeState = await deserializeState(attributeService, rawState);
      expect(runtimeState).toEqual(rawState);
    });

    it('should wrap Lens doc/attributes into component state shape', async () => {
      const attributeService = makeAttributeService(defaultDoc);
      const runtimeState = await deserializeState(attributeService, defaultDoc);
      expect(runtimeState).toEqual(
        expect.objectContaining({
          attributes: { ...defaultDoc, references: defaultDoc.references },
        })
      );
    });

    it('load a by-ref doc from the attribute service', async () => {
      const attributeService = makeAttributeService(defaultDoc);
      await deserializeState(attributeService, {
        savedObjectId: '123',
      });

      expect(attributeService.loadFromLibrary).toHaveBeenCalledWith('123');
    });

    it('should fallback to an empty Lens doc if the saved object is not found', async () => {
      const attributeService = makeAttributeService(defaultDoc);
      attributeService.loadFromLibrary.mockRejectedValueOnce(new Error('not found'));
      const runtimeState = await deserializeState(attributeService, {
        savedObjectId: '123',
      });
      // check the visualizationType set to null for empty state
      expect(runtimeState.attributes.visualizationType).toBeNull();
    });

    describe('injected references should overwrite inner ones', () => {
      // There are 3 possible scenarios here for reference injections:
      // * default space for a by-value
      // * default space for a by-ref with a "lens" panel reference type
      // * other space for a by-value with new ref ids

      it('should inject correctly serialized references into runtime state for a by value in the default space', async () => {
        const attributeService = makeAttributeService(defaultDoc);
        const mockedReferences = [
          { id: 'serializedRefs', name: 'index-pattern-0', type: 'mocked-reference' },
        ];
        const runtimeState = await deserializeState(
          attributeService,
          {
            attributes: defaultDoc,
          },
          mockedReferences
        );
        expect(attributeService.injectReferences).toHaveBeenCalled();
        expect(runtimeState.attributes.references).toEqual(mockedReferences);
      });

      it('should inject correctly serialized references into runtime state for a by ref in the default space', async () => {
        const attributeService = makeAttributeService(defaultDoc);
        const mockedReferences = [
          { id: 'serializedRefs', name: 'index-pattern-0', type: 'mocked-reference' },
        ];
        const runtimeState = await deserializeState(
          attributeService,
          {
            savedObjectId: '123',
          },
          mockedReferences
        );
        expect(attributeService.injectReferences).not.toHaveBeenCalled();
        // Note the original references should be kept
        expect(runtimeState.attributes.references).toEqual(defaultDoc.references);
      });

      it('should inject correctly serialized references into runtime state for a by value in another space', async () => {
        const attributeService = makeAttributeService(defaultDoc);
        const mockedReferences = [
          { id: 'serializedRefs', name: 'index-pattern-0', type: 'mocked-reference' },
        ];
        const runtimeState = await deserializeState(
          attributeService,
          {
            attributes: defaultDoc,
          },
          mockedReferences
        );
        expect(attributeService.injectReferences).toHaveBeenCalled();
        // note: in this case the references are swapped
        expect(runtimeState.attributes.references).toEqual(mockedReferences);
      });
    });
  });
});
