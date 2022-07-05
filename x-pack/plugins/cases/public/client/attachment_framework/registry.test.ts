/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentTypeRegistry } from './registry';

export const ExpressionComponent: React.FunctionComponent = () => {
  return null;
};

const getItem = (id: string = 'test') => {
  return { id };
};

describe('AttachmentTypeRegistry', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('has()', () => {
    it('returns false for unregistered items', () => {
      const registry = new AttachmentTypeRegistry();

      expect(registry.has('test')).toEqual(false);
    });

    it('returns true after registering an item', () => {
      const registry = new AttachmentTypeRegistry();
      registry.register(getItem());

      expect(registry.has('test'));
    });
  });

  describe('register()', () => {
    it('able to register items', () => {
      const registry = new AttachmentTypeRegistry();
      registry.register(getItem());

      expect(registry.has('test')).toEqual(true);
    });

    it('throws error if item is already registered', () => {
      const registry = new AttachmentTypeRegistry();
      registry.register(getItem('test'));

      expect(() => registry.register(getItem('test'))).toThrowErrorMatchingInlineSnapshot(
        `"Attachment type \\"test\\" is already registered."`
      );
    });
  });

  describe('get()', () => {
    it('returns item', () => {
      const registry = new AttachmentTypeRegistry();
      registry.register(getItem());
      const actionType = registry.get('test');

      expect(actionType).toEqual({
        id: 'test',
      });
    });

    it(`throw error when action type doesn't exist`, () => {
      const registry = new AttachmentTypeRegistry();
      expect(() => registry.get('not-exist-item')).toThrowErrorMatchingInlineSnapshot(
        `"Attachment type \\"not-exist-item\\" is not registered."`
      );
    });
  });

  describe('list()', () => {
    it('returns list of items', () => {
      const actionTypeRegistry = new AttachmentTypeRegistry();
      actionTypeRegistry.register(getItem());
      const actionTypes = actionTypeRegistry.list();

      expect(actionTypes).toEqual([
        {
          id: 'test',
        },
      ]);
    });
  });
});
