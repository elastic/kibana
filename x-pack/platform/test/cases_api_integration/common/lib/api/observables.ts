/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { getBulkCreateObservablesUrl } from '@kbn/cases-plugin/common/api';
import type { BulkAddObservablesRequest } from '@kbn/cases-plugin/common/types/api';
import type { Case } from '@kbn/cases-plugin/common/types/domain';
import type { User } from '../authentication/types';
import { superUser } from '../authentication/users';
import { getSpaceUrlPrefix } from './helpers';

export const bulkAddObservables = async ({
  supertest,
  params,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  params: BulkAddObservablesRequest;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<Case> => {
  const { body: theCase } = await supertest
    .post(`${getSpaceUrlPrefix(auth?.space)}${getBulkCreateObservablesUrl(params.caseId)}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .send(params)
    .expect(expectedHttpCode);

  return theCase;
};
