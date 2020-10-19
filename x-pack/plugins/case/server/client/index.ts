/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseClientFactoryArguments, CaseClient } from './types';
import { create } from './create';
import { update } from './update';
import { addComment } from './add_comment';

export const createCaseClient = ({
  caseConfigureService,
  caseService,
  userActionService,
}: CaseClientFactoryArguments): CaseClient => {
  return {
    create: create({ caseConfigureService, caseService, userActionService }),
    update: update({ caseConfigureService, caseService, userActionService }),
    addComment: addComment({ caseConfigureService, caseService, userActionService }),
  };
};
