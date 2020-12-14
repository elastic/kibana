/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseClientFactoryArguments, CaseClient } from './types';
import { create } from './cases/create';
import { update } from './cases/update';
import { addComment } from './comments/add';
import { updateAlertsStatus } from './alerts/update_status';

export { CaseClient } from './types';

export const createCaseClient = ({
  savedObjectsClient,
  request,
  caseConfigureService,
  caseService,
  userActionService,
  alertsService,
  context,
}: CaseClientFactoryArguments): CaseClient => {
  return {
    create: create({
      savedObjectsClient,
      request,
      caseConfigureService,
      caseService,
      userActionService,
      alertsService,
      context,
    }),
    update: update({
      savedObjectsClient,
      request,
      caseConfigureService,
      caseService,
      userActionService,
      alertsService,
      context,
    }),
    addComment: addComment({
      savedObjectsClient,
      request,
      caseConfigureService,
      caseService,
      userActionService,
      alertsService,
      context,
    }),
    updateAlertsStatus: updateAlertsStatus({
      savedObjectsClient,
      request,
      caseConfigureService,
      caseService,
      userActionService,
      alertsService,
      context,
    }),
  };
};
