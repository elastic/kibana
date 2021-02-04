/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CaseClientFactoryArguments,
  CaseClient,
  CaseClientFactoryMethods,
  CaseClientMethods,
} from './types';
import { create } from './cases/create';
import { get } from './cases/get';
import { update } from './cases/update';
import { push } from './cases/push';
import { addComment } from './comments/add';
import { getFields } from './configure/get_fields';
import { getMappings } from './configure/get_mappings';
import { updateAlertsStatus } from './alerts/update_status';
import { get as getUserActions } from './user_actions/get';
import { get as getAlerts } from './alerts/get';

export { CaseClient } from './types';

export const createCaseClient = (args: CaseClientFactoryArguments): CaseClient => {
  const methods: CaseClientFactoryMethods = {
    create,
    get,
    update,
    push,
    addComment,
    getAlerts,
    getFields,
    getMappings,
    getUserActions,
    updateAlertsStatus,
  };

  return (Object.keys(methods) as CaseClientMethods[]).reduce((client, method) => {
    client[method] = methods[method](args);
    return client;
  }, {} as CaseClient);
};
