/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeleteRuleOptions } from './types';

export const deleteRules = async ({
  rulesClient,
  ruleStatusClient,
  ruleStatuses,
  id,
}: DeleteRuleOptions) => {
  await rulesClient.delete({ id });
  ruleStatuses.forEach(async (obj) => ruleStatusClient.delete(obj.id));
};
