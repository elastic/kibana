/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseClientFactoryArguments, CaseClient } from './types';
import { create } from './create';
import { update } from './update';
import { addComment } from './add_comment';

export { CaseClient } from './types';

export const createCaseClient = ({
  savedObjectsClient,
  caseConfigureService,
  caseService,
  userActionService,
}: CaseClientFactoryArguments): CaseClient => {
  return {
    create: create({ savedObjectsClient, caseConfigureService, caseService, userActionService }),
    update: update({ savedObjectsClient, caseConfigureService, caseService, userActionService }),
    addComment: addComment({
      savedObjectsClient,
      caseConfigureService,
      caseService,
      userActionService,
    }),
  };
};
