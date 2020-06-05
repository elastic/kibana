/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

import { AlertAction } from '../../../alerts/common';

export type RuleAlertAction = Omit<AlertAction, 'actionTypeId'> & {
  action_type_id: string;
};

export const RuleTypeSchema = t.keyof({
  query: null,
  saved_query: null,
  machine_learning: null,
});
export type RuleType = t.TypeOf<typeof RuleTypeSchema>;
