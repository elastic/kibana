/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutorParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { RenderParameterTemplates } from '@kbn/actions-plugin/server/types';
import { SUB_ACTION } from '../../../common/thehive/constants';

export const renderParameterTemplates: RenderParameterTemplates<ExecutorParams> = (
  logger,
  params,
  variables
) => {
  if (params?.subAction === SUB_ACTION.PUSH_TO_SERVICE || params?.subAction === SUB_ACTION.CREATE_ALERT) return params;
  return params;
};
