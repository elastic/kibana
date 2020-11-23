/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseClientFactoryArguments, CaseClient } from './types';
import { create } from './cases/create';
import { update } from './cases/update';
import { addComment } from './comments/add';
import { getFields } from './configure/fields';
import { getMappings } from './configure/mappings';

export { CaseClient } from './types';

export const createCaseClient = ({
  caseConfigureService,
  caseService,
  connectorMappingsService,
  request,
  savedObjectsClient,
  userActionService,
}: CaseClientFactoryArguments): CaseClient => {
  return {
    create: create({
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      savedObjectsClient,
      userActionService,
    }),
    update: update({
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      savedObjectsClient,
      userActionService,
    }),
    addComment: addComment({
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      savedObjectsClient,
      userActionService,
    }),
    getFields: getFields(),
    getMappings: getMappings({
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      savedObjectsClient,
      userActionService,
    }),
  };
};
