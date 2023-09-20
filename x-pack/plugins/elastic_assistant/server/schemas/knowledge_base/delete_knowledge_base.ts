/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

/** Validates the URL path of a DELETE request to the `/knowledge_base/{resource}` endpoint */
export const DeleteKnowledgeBasePathParams = t.type({
  resource: t.union([t.string, t.undefined]),
});
