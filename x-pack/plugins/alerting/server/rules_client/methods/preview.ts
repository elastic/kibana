/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { v4 as uuidv4 } from 'uuid';
import { trim, truncate } from 'lodash';
import { Rule } from '../../types';
import { validateRuleTypeParams } from '../../lib';
import { validateActions } from '../lib';
import { apiKeyAsAlertAttributes } from '../common';
import { NormalizedAlertAction, RulesClientContext } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PreviewOptions {
  data: Omit<
    Rule<any>,
    | 'id'
    | 'createdBy'
    | 'updatedBy'
    | 'createdAt'
    | 'updatedAt'
    | 'apiKey'
    | 'apiKeyOwner'
    | 'apiKeyCreatedByUser'
    | 'muteAll'
    | 'mutedInstanceIds'
    | 'actions'
    | 'executionStatus'
    | 'snoozeSchedule'
    | 'isSnoozedUntil'
    | 'lastRun'
    | 'nextRun'
    | 'revision'
  > & { actions: NormalizedAlertAction[] };
}

export async function preview(
  context: RulesClientContext,
  { data }: PreviewOptions
): Promise<string> {
  const executionUuid = uuidv4();
  const temporaryRuleId = `preview-${uuidv4()}`;

  context.ruleTypeRegistry.ensureRuleTypeEnabled(data.alertTypeId);

  // Throws an error if alert type isn't registered
  const ruleType = context.ruleTypeRegistry.get(data.alertTypeId);

  const validatedAlertTypeParams = validateRuleTypeParams(data.params, ruleType.validate.params);
  const username = await context.getUserName();

  // Create an API key for the preview and invalidate at the end
  let createdAPIKey = null;
  try {
    const name = truncate(`AlertingPreview: ${ruleType.id}/${trim(data.name)}`, { length: 256 });
    createdAPIKey = await context.createAPIKey(name);
  } catch (error) {
    throw Boom.badRequest(
      `Error previewing rule: could not create temporary API key - ${error.message}`
    );
  }

  validateActions(context, ruleType, data);

  await context.taskManager.schedule({
    taskType: `alerting:preview`,
    params: {
      executionUuid,
      rule: {
        ...data,
        ...apiKeyAsAlertAttributes(createdAPIKey, username, false),
        params: validatedAlertTypeParams,
        spaceId: context.spaceId,
        id: temporaryRuleId,
      },
    },
    state: {},
    scope: ['alerting'],
  });

  return executionUuid;
}
