/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseClientFactoryArguments, CaseClient } from './types';
import { create } from './cases/create';
import { update } from './cases/update';
import { addComment } from './comments/add';
import { getFields } from './configure/get_fields';
import { getMappings } from './configure/get_mappings';
import { updateAlertsStatus } from './alerts/update_status';

export { CaseClient } from './types';

export const createCaseClient = (clientArgs: CaseClientFactoryArguments): CaseClient => {
  return {
    create: create(clientArgs),
    update: update(clientArgs),
    addComment: addComment(clientArgs),
    getFields: getFields(),
    getMappings: getMappings(clientArgs),
    updateAlertsStatus: updateAlertsStatus(clientArgs),
  };
};
