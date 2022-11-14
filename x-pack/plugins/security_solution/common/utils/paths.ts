/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_RULE_DETAILS_PATH } from '../constants';

export const getSecuritySolutionRuleDetailsFullPath = (id: string): string => {
  return `${APP_RULE_DETAILS_PATH}/${id}`;
};
