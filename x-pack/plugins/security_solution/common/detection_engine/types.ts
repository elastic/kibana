/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AlertAction } from '../../../alerts/common';

export type RuleAlertAction = Omit<AlertAction, 'actionTypeId'> & {
  action_type_id: string;
};
