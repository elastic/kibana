/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { manifestSchemaVersion, semanticVersion } from '../../../../common/endpoint/schema/common';

const optionalVersions = t.partial({
  soVersion: t.string,
});

export const manifestVersion = t.intersection([
  optionalVersions,
  t.exact(
    t.type({
      schemaVersion: manifestSchemaVersion,
      semanticVersion,
    })
  ),
]);
export type ManifestVersion = t.TypeOf<typeof manifestVersion>;
