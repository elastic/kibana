/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

// TODO: convert to io-tsk
// import * as t from 'io-ts';

export const getExceptionListManifestSchema = Joi.object({
  manifestVersion: Joi.string(),
  schemaVersion: Joi.string(),
});
