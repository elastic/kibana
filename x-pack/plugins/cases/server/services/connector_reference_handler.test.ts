/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NONE_CONNECTOR_ID } from '../../common/api';
import { ConnectorReferenceHandler } from './connector_reference_handler';

describe('ConnectorReferenceHandler', () => {
  describe('merge', () => {
    it('overwrites the original reference with the new one', () => {
      const handler = new ConnectorReferenceHandler([{ id: 'hello2', type: '1', name: 'a' }]);

      expect(handler.build([{ id: 'hello', type: '1', name: 'a' }])).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "hello2",
            "name": "a",
            "type": "1",
          },
        ]
      `);
    });

    it('returns the original references if the new references is an empty array', () => {
      const handler = new ConnectorReferenceHandler([]);

      expect(handler.build([{ id: 'hello', type: '1', name: 'a' }])).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "hello",
            "name": "a",
            "type": "1",
          },
        ]
      `);
    });

    it('returns undefined when there are no original references and no new ones', () => {
      const handler = new ConnectorReferenceHandler([]);

      expect(handler.build()).toBeUndefined();
    });

    it('returns an empty array when there is an empty array of original references and no new ones', () => {
      const handler = new ConnectorReferenceHandler([]);

      expect(handler.build([])).toMatchInlineSnapshot(`Array []`);
    });

    it('removes a reference when the id field is null', () => {
      const handler = new ConnectorReferenceHandler([{ id: null, name: 'a', type: '1' }]);

      expect(handler.build([{ id: 'hello', type: '1', name: 'a' }])).toMatchInlineSnapshot(
        `Array []`
      );
    });

    it('removes a reference when the id field is the none connector', () => {
      const handler = new ConnectorReferenceHandler([
        { id: NONE_CONNECTOR_ID, name: 'a', type: '1' },
      ]);

      expect(handler.build([{ id: 'hello', type: '1', name: 'a' }])).toMatchInlineSnapshot(
        `Array []`
      );
    });

    it('does not remove a reference when the id field is undefined', () => {
      const handler = new ConnectorReferenceHandler([{ id: undefined, name: 'a', type: '1' }]);

      expect(handler.build([{ id: 'hello', type: '1', name: 'a' }])).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "hello",
            "name": "a",
            "type": "1",
          },
        ]
      `);
    });

    it('adds a new reference to existing ones', () => {
      const handler = new ConnectorReferenceHandler([{ id: 'awesome', type: '2', name: 'b' }]);

      expect(handler.build([{ id: 'hello', type: '1', name: 'a' }])).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "hello",
            "name": "a",
            "type": "1",
          },
          Object {
            "id": "awesome",
            "name": "b",
            "type": "2",
          },
        ]
      `);
    });

    it('adds new references to an undefined original reference array', () => {
      const handler = new ConnectorReferenceHandler([
        { id: 'awesome', type: '2', name: 'a' },
        { id: 'awesome', type: '2', name: 'b' },
      ]);

      expect(handler.build()).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "awesome",
            "name": "a",
            "type": "2",
          },
          Object {
            "id": "awesome",
            "name": "b",
            "type": "2",
          },
        ]
      `);
    });

    it('adds new references to an empty original reference array', () => {
      const handler = new ConnectorReferenceHandler([
        { id: 'awesome', type: '2', name: 'a' },
        { id: 'awesome', type: '2', name: 'b' },
      ]);

      expect(handler.build()).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "awesome",
            "name": "a",
            "type": "2",
          },
          Object {
            "id": "awesome",
            "name": "b",
            "type": "2",
          },
        ]
      `);
    });
  });
});
