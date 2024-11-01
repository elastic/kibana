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
      const rawState = {
        attributes: defaultDoc,
      };
      const runtimeState = await deserializeState(makeAttributeService(defaultDoc), rawState);
      expect(runtimeState).toBe(rawState);
    });

    it('should wrap Lens doc/attributes into component state shape', async () => {
      const runtimeState = await deserializeState(makeAttributeService(defaultDoc), defaultDoc);
      expect(runtimeState).toEqual(expect.objectContaining({ attributes: defaultDoc }));
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
  });
});
