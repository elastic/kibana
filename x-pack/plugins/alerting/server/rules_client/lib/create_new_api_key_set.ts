/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { RawRule } from '../../types';
import { generateAPIKeyName, apiKeyAsAlertAttributes } from '../common';
import { RulesClientContext } from '../types';

export async function createNewAPIKeySet(
  context: RulesClientContext,
  {
    attributes,
    username,
  }: {
    attributes: RawRule;
    username: string | null;
  }
): Promise<Pick<RawRule, 'apiKey' | 'apiKeyOwner'>> {
  let createdAPIKey = null;
  try {
    createdAPIKey = await context.createAPIKey(
      generateAPIKeyName(attributes.alertTypeId, attributes.name)
    );
  } catch (error) {
    throw Boom.badRequest(`Error creating API key for rule: ${error.message}`);
  }

  return apiKeyAsAlertAttributes(createdAPIKey, username);
}
