/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockedIndexPattern } from '../../mocks';
import { getInvalidFieldMessage } from './helpers';

describe('helpers', () => {
  describe('getInvalidFieldMessage', () => {
    it('return an error if a field was removed', () => {
      const messages = getInvalidFieldMessage(
        {
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'count', // <= invalid
          sourceField: 'bytes',
        },
        createMockedIndexPattern()
      );
      expect(messages).toHaveLength(1);
      expect(messages![0]).toEqual('Field bytes was not found');
    });

    it('returns an error if a field is the wrong type', () => {
      const messages = getInvalidFieldMessage(
        {
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'average', // <= invalid
          sourceField: 'timestamp',
        },
        createMockedIndexPattern()
      );
      expect(messages).toHaveLength(1);
      expect(messages![0]).toEqual('Field timestamp is of the wrong type');
    });

    it('returns no message if all fields are matching', () => {
      const messages = getInvalidFieldMessage(
        {
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'average',
          sourceField: 'bytes',
        },
        createMockedIndexPattern()
      );
      expect(messages).toBeUndefined();
    });
  });
});
