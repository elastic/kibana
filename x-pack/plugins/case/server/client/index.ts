/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseClientFactoryArguments, CaseClient } from './types';
import { create } from './cases/create';
import { update } from './cases/update';
import { addComment } from './comments/add';
import { getFields } from './configure/get_fields';
import { getMappings } from './configure/get_mappings';
import { updateAlertsStatus } from './alerts/update_status';

export { CaseClient } from './types';

export const createCaseClient = ({
  caseConfigureService,
  caseService,
  connectorMappingsService,
  request,
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
      savedObjectsClient,
      userActionService,
    }),
    update: update({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      savedObjectsClient,
      userActionService,
    }),
    addComment: addComment({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
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
      savedObjectsClient,
      userActionService,
    }),
  };
};
