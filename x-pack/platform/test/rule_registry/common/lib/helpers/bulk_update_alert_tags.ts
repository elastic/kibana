/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import type { User } from '../authentication/types';
import { getSpaceUrlPrefix } from '../authentication/spaces';

export const bulkUpdateAlertTags = async ({
  supertest,
  spaceId,
  user,
  add,
  remove,
  alertIds,
  index,
  query,
  expectedStatusCode = 200,
}: {
  supertest: SuperTest.Agent;
  spaceId?: string;
  user: User;
  add?: string[];
  remove?: string[];
  alertIds?: string[];
  index: string;
  query?: string;
  expectedStatusCode?: number;
}) => {
  return supertest
    .post(`${getSpaceUrlPrefix(spaceId)}${BASE_RAC_ALERTS_API_PATH}/tags`)
    .auth(user.username, user.password)
    .send({ add, remove, alertIds, index, query })
    .set('kbn-xsrf', 'foo')
    .expect(expectedStatusCode);
};
