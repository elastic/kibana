/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../../../../../common/api/detection_engine';
import { getRulesSchemaMock } from '../../../../../../../../common/api/detection_engine/model/rule_schema/rule_response_schema.mock';

export const getRuleByRuleId = jest
  .fn()
  .mockImplementation(async (): Promise<RuleResponse | null> => getRulesSchemaMock());
