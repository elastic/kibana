/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { identifier, sha256 } from '../../../../../common/endpoint/schema/common';

export const downloadArtifactRequestParamsSchema = t.exact(
  t.type({
    identifier,
    sha256,
  })
);

export type DownloadArtifactRequestParamsSchema = t.TypeOf<
  typeof downloadArtifactRequestParamsSchema
>;
