/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

const exceptionListManifestEntrySchema = t.exact(
  t.type({
    id: t.string,
    name: t.string,
    schemaVersion: t.string,
    sha256: t.string,
    created: t.number,
  })
);

export const exceptionListManifestSchema = t.exact(
  t.type({
    artifacts: t.array(exceptionListManifestEntrySchema),
  })
);

export type ExceptionListManifestSchema = t.TypeOf<typeof exceptionListManifestSchema>;
