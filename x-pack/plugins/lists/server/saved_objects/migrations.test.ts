/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectUnsanitizedDoc } from 'kibana/server';

import { ExceptionListSoSchema } from '../../common/schemas';

import { migrations } from './migrations';

describe('7.10.0 lists migrations', () => {
  const migration = migrations['7.10.0'];

  test('properly copies os tags to os_types', () => {
    const doc = {
      attributes: {
        _tags: ['1234', 'os:windows'],
        comments: [],
      },
      id: 'abcd',
      migrationVersion: {},
      references: [],
      type: 'so-type',
      updated_at: '2020-06-09T20:18:20.349Z',
    };
    expect(migration(doc as SavedObjectUnsanitizedDoc<ExceptionListSoSchema>)).toEqual({
      attributes: {
        buildNum: 9007199254740991,
        'securitySolution:defaultAnomalyScore': 59,
        'securitySolution:enableNewsFeed': false,
      },
      id: '8.0.0',
      migrationVersion: {},
      references: [],
      type: 'config',
      updated_at: '2020-06-09T20:18:20.349Z',
    });
  });
});
