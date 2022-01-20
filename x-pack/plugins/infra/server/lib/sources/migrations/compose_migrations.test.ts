/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectUnsanitizedDoc } from '../../../../../../../src/core/server';
import { migrationMocks } from '../../../../../../../src/core/server/mocks';
import { composeMigrations } from './compose_migrations';

type TestDocument = SavedObjectUnsanitizedDoc<{
  a: number;
}>;

describe('composeMigrations function', () => {
  test('correctly composes two migration functions', () => {
    const firstMigration = jest.fn(
      (doc: TestDocument): TestDocument => ({
        ...doc,
        attributes: { ...doc.attributes, a: doc.attributes.a + 1 },
      })
    );
    const secondMigration = jest.fn(
      (doc: TestDocument): TestDocument => ({
        ...doc,
        attributes: { ...doc.attributes, a: doc.attributes.a ** 2 },
      })
    );

    const composedMigrations = composeMigrations(firstMigration, secondMigration);
    const migrationContext = migrationMocks.createContext();

    expect(
      composedMigrations({ id: 'ID', type: 'TYPE', attributes: { a: 1 } }, migrationContext)
    ).toStrictEqual({ id: 'ID', type: 'TYPE', attributes: { a: 4 } });
  });
});
