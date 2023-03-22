/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const CaseFileMetadataRt = rt.type({
  // TODO: do we want this as an array?
  caseId: rt.string,
  // TODO: do we want this as an array?
  owner: rt.array(rt.string),
});

export type CaseFileMetadata = rt.TypeOf<typeof CaseFileMetadataRt>;
