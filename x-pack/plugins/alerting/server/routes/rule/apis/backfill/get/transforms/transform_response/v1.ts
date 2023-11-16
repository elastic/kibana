/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';
import { SanitizedAdHocRuleRunParams } from '../../../../../../../types';

export const transformResponse = (result: SanitizedAdHocRuleRunParams) => {
  return {
    api_key_id: result.apiKeyId,
    created_at: result.createdAt,
    current_start: result.currentStart,
    duration: result.duration,
    enabled: result.enabled,
    ...(result.end ? { end: result.end } : {}),
    rule: {
      id: result.rule.id,
      name: result.rule.name,
      tags: result.rule.tags,
      rule_type_id: result.rule.alertTypeId,
      params: result.rule.params,
      api_key_owner: result.rule.apiKeyOwner,
      api_key_created_by_user: result.rule.apiKeyCreatedByUser,
      consumer: result.rule.consumer,
      enabled: result.rule.enabled,
      schedule: result.rule.schedule,
      created_by: result.rule.createdBy,
      updated_by: result.rule.updatedBy,
      created_at: isString(result.rule.createdAt)
        ? result.rule.createdAt
        : result.rule.createdAt.toISOString(),
      updated_at: isString(result.rule.updatedAt)
        ? result.rule.updatedAt
        : result.rule.updatedAt.toISOString(),
      revision: result.rule.revision,
    },
    space_id: result.spaceId,
    start: result.start,
    status: result.status,
  };
};
