/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectMigrationFn } from '../../../../../../../src/core/server';

type InputAttributesOf<MigrationFn> = MigrationFn extends SavedObjectMigrationFn<
  infer InputAttributes,
  any
>
  ? InputAttributes
  : never;
type MigratedAttributesOf<MigrationFn> = MigrationFn extends SavedObjectMigrationFn<
  any,
  infer MigratedAttributes
>
  ? MigratedAttributes
  : never;

export function composeMigrations<
  FirstFn extends SavedObjectMigrationFn<any, any>,
  IntermediateFns extends SavedObjectMigrationFn[],
  LastFn extends SavedObjectMigrationFn<any, any>
>(
  ...migrations: [FirstFn, ...IntermediateFns, LastFn]
): SavedObjectMigrationFn<InputAttributesOf<FirstFn>, MigratedAttributesOf<LastFn>> {
  return (doc, context) =>
    migrations.reduce(
      (migratedDoc, nextMigration) => nextMigration(migratedDoc, context),
      doc as any
    );
}
