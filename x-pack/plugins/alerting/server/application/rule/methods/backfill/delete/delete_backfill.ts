/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { RulesClientContext } from '../../../../../rules_client';
import type { DeleteBackfillOptions } from './types';
import { deleteBackfillOptionsSchema } from './schemas';

export async function deleteBackfill(context: RulesClientContext, options: DeleteBackfillOptions) {
  try {
    deleteBackfillOptionsSchema.validate(options);
  } catch (error) {
    throw Boom.badRequest(`Error validating delete options - ${error.message}`);
  }
}
