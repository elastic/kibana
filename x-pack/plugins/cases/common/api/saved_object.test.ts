/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectFindOptionsRt } from './saved_object';

describe('SavedObject', () => {
  describe('SavedObjectFindOptionsRt', () => {
    const defaultRequest = {
      defaultSearchOperator: 'AND',
      hasReferenceOperator: 'OR',
      hasReference: [
        {
          id: 'ref-id',
          type: 'ref-type',
        },
        {
          id: 'ref-id',
          type: 'ref-type',
        },
      ],
      fields: ['severity', 'status'],
      filter: 'status',
      page: '1',
      perPage: '10',
      search: 'abc',
      searchFields: ['severity', 'comment'],
      sortField: 'created_by',
      sortOrder: 'desc',
    };

    it('has expected attributes in request', () => {
      const query = SavedObjectFindOptionsRt.decode(defaultRequest);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: {
          ...defaultRequest,
          page: 1,
          perPage: 10,
        },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = SavedObjectFindOptionsRt.decode({
        ...defaultRequest,
        foo: 'bar',
      });

      expect(query).toMatchObject({
        _tag: 'Right',
        right: {
          ...defaultRequest,
          page: 1,
          perPage: 10,
        },
      });
    });

    it('removes foo:bar attributes from hasReference', () => {
      const query = SavedObjectFindOptionsRt.decode({
        ...defaultRequest,
        hasReference: {
          ...defaultRequest.hasReference[0],
          foo: 'bar',
        },
      });

      expect(query).toMatchObject({
        _tag: 'Right',
        right: {
          ...defaultRequest,
          hasReference: {
            ...defaultRequest.hasReference[0],
          },
          page: 1,
          perPage: 10,
        },
      });
    });

    it('removes foo:bar attributes from when partial fields', () => {
      const query = SavedObjectFindOptionsRt.decode({
        defaultSearchOperator: 'AND',
        hasReferenceOperator: 'OR',
        hasReference: [
          {
            id: 'ref-id',
            type: 'ref-type',
          },
          {
            id: 'ref-id',
            type: 'ref-type',
          },
        ],
        fields: ['severity', 'status'],
        filter: 'status',
        foo: 'bar',
      });

      expect(query).toMatchObject({
        _tag: 'Right',
        right: {
          defaultSearchOperator: 'AND',
          hasReferenceOperator: 'OR',
          hasReference: [
            {
              id: 'ref-id',
              type: 'ref-type',
            },
            {
              id: 'ref-id',
              type: 'ref-type',
            },
          ],
          fields: ['severity', 'status'],
          filter: 'status',
        },
      });
    });
  });
});
