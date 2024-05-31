/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/public';
import { isLensEmbeddable, hasInput, getLensCaseAttachment } from './utils';

describe('utils', () => {
  describe('isLensEmbeddable', () => {
    it('return true if it is a lens embeddable', () => {
      // @ts-expect-error: extra attributes are not needed
      expect(isLensEmbeddable({ type: LENS_EMBEDDABLE_TYPE })).toBe(true);
    });

    it('return false if it is not a lens embeddable', () => {
      // @ts-expect-error: extra attributes are not needed
      expect(isLensEmbeddable({ type: 'not-exist' })).toBe(false);
    });
  });

  describe('hasInput', () => {
    it('return true if it has correct input', () => {
      const embeddable = {
        getInput: () => ({ timeRange: {} }),
        getFullAttributes: jest.fn().mockReturnValue({}),
      };

      // @ts-expect-error: extra attributes are not needed
      expect(hasInput(embeddable)).toBe(true);
    });

    it('return false if attributes are null', () => {
      const embeddable = {
        getInput: () => ({ timeRange: {} }),
        getFullAttributes: jest.fn().mockReturnValue(null),
      };

      // @ts-expect-error: extra attributes are not needed
      expect(hasInput(embeddable)).toBe(false);
    });

    it('return false if timeRange is null', () => {
      const embeddable = { getInput: () => ({ timeRange: null }), getFullAttributes: () => ({}) };

      // @ts-expect-error: extra attributes are not needed
      expect(hasInput(embeddable)).toBe(false);
    });
  });

  describe('getLensCaseAttachment', () => {
    it('create a case lens attachment correctly', () => {
      const embeddable = { attributes: {}, timeRange: {} };

      // @ts-expect-error: extra attributes are not needed
      expect(getLensCaseAttachment(embeddable)).toMatchInlineSnapshot(`
        Object {
          "persistableStateAttachmentState": Object {
            "attributes": Object {},
            "metadata": undefined,
            "timeRange": Object {},
          },
          "persistableStateAttachmentTypeId": ".lens",
          "type": "persistableState",
        }
      `);
    });
  });
});
