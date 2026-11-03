/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import {
  CASE_EXTERNAL_SYNC_NOTIFY_URL,
  INTERNAL_EXTERNAL_SYNC_SERVICE_ACCOUNT_URL,
} from '@kbn/cases-plugin/common/constants';
import type {
  ExternalSyncNotifyResponse,
  ExternalSyncServiceAccountResponse,
  ExternalSyncServiceAccountUnbindResponse,
} from '@kbn/cases-plugin/common/types/api';
import type { User } from '../authentication/types';
import { superUser } from '../authentication/users';
import { getSpaceUrlPrefix, setupAuth } from './helpers';

type Auth = { user: User; space: string | null } | null;

const serviceAccountUrl = (connectorId: string, space: string | null | undefined) =>
  `${getSpaceUrlPrefix(space)}${INTERNAL_EXTERNAL_SYNC_SERVICE_ACCOUNT_URL.replace(
    '{connector_id}',
    encodeURIComponent(connectorId)
  )}`;

export const notifyExternalSync = async ({
  supertest,
  connectorId,
  body,
  expectedHttpCode = 202,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  connectorId: string;
  body: Record<string, unknown>;
  expectedHttpCode?: number;
  auth?: Auth;
}): Promise<ExternalSyncNotifyResponse> => {
  const apiCall = supertest.post(
    `${getSpaceUrlPrefix(auth?.space)}${CASE_EXTERNAL_SYNC_NOTIFY_URL.replace(
      '{connector_id}',
      encodeURIComponent(connectorId)
    )}`
  );

  void setupAuth({ apiCall, headers: {}, auth });

  const { body: res } = await apiCall.set('kbn-xsrf', 'true').send(body).expect(expectedHttpCode);

  return res;
};

export const getExternalSyncServiceAccount = async ({
  supertest,
  connectorId,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  connectorId: string;
  expectedHttpCode?: number;
  auth?: Auth;
}): Promise<ExternalSyncServiceAccountResponse> => {
  const apiCall = supertest.get(serviceAccountUrl(connectorId, auth?.space));

  void setupAuth({ apiCall, headers: {}, auth });

  const { body: res } = await apiCall
    .set('x-elastic-internal-origin', 'kibana')
    .send()
    .expect(expectedHttpCode);

  return res;
};

export const bindExternalSyncServiceAccount = async ({
  supertest,
  connectorId,
  serviceAccountId,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  connectorId: string;
  serviceAccountId: string;
  expectedHttpCode?: number;
  auth?: Auth;
}): Promise<ExternalSyncServiceAccountResponse> => {
  const apiCall = supertest.put(serviceAccountUrl(connectorId, auth?.space));

  void setupAuth({ apiCall, headers: {}, auth });

  const { body: res } = await apiCall
    .set('kbn-xsrf', 'true')
    .set('x-elastic-internal-origin', 'kibana')
    .send({ service_account_id: serviceAccountId })
    .expect(expectedHttpCode);

  return res;
};

export const unbindExternalSyncServiceAccount = async ({
  supertest,
  connectorId,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  connectorId: string;
  expectedHttpCode?: number;
  auth?: Auth;
}): Promise<ExternalSyncServiceAccountUnbindResponse> => {
  const apiCall = supertest.delete(serviceAccountUrl(connectorId, auth?.space));

  void setupAuth({ apiCall, headers: {}, auth });

  const { body: res } = await apiCall
    .set('kbn-xsrf', 'true')
    .set('x-elastic-internal-origin', 'kibana')
    .send()
    .expect(expectedHttpCode);

  return res;
};
