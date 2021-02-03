/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseClientFactoryArguments, CaseClient } from './types';
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

// TODO: Refactor to accommodate the growth of the case client
export const createCaseClient = ({
  caseConfigureService,
  caseService,
  connectorMappingsService,
  request,
  response,
  savedObjectsClient,
  userActionService,
  alertsService,
  context,
}: CaseClientFactoryArguments): CaseClient => {
  return {
    create: create({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      response,
      savedObjectsClient,
      userActionService,
    }),
    get: get({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      response,
      savedObjectsClient,
      userActionService,
    }),
    update: update({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      response,
      savedObjectsClient,
      userActionService,
    }),
    push: push({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      response,
      savedObjectsClient,
      userActionService,
      context,
    }),
    addComment: addComment({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      response,
      savedObjectsClient,
      userActionService,
    }),
    getAlerts: getAlerts({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      context,
      request,
      response,
      savedObjectsClient,
      userActionService,
    }),
    getFields: getFields(),
    getMappings: getMappings({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      response,
      savedObjectsClient,
      userActionService,
    }),
    getUserActions: getUserActions({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      response,
      savedObjectsClient,
      userActionService,
    }),
    updateAlertsStatus: updateAlertsStatus({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      context,
      request,
      response,
      savedObjectsClient,
      userActionService,
    }),
  };
};
