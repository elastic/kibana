/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SupertestWithoutAuthProviderType } from '@kbn/ftr-common-functional-services';
import type { User } from '../../../../../common/types';
import { getUrlPrefix } from '../../../../../common/lib';

export const RETURN_URL = 'https://localhost:5601/app/connectors';

export async function login(
  supertestWithoutAuth: SupertestWithoutAuthProviderType,
  user: User
): Promise<string> {
  const response = await supertestWithoutAuth
    .post('/internal/security/login')
    .set('kbn-xsrf', 'xxx')
    .send({
      providerType: 'basic',
      providerName: 'basic',
      currentURL: '/',
      params: { username: user.username, password: user.password },
    })
    .expect(200);

  return response.header['set-cookie'][0];
}

export async function performOAuthFlow(
  supertestWithoutAuth: SupertestWithoutAuthProviderType,
  {
    spaceId,
    connectorId,
    sessionCookie,
    authCode = 'fake-auth-code',
  }: { spaceId: string; connectorId: string; sessionCookie: string; authCode?: string }
): Promise<void> {
  const { body: startFlowResponse } = await supertestWithoutAuth
    .post(`${getUrlPrefix(spaceId)}/internal/actions/connector/${connectorId}/_start_oauth_flow`)
    .set('Cookie', sessionCookie)
    .set('kbn-xsrf', 'foo')
    .send({ returnUrl: RETURN_URL })
    .expect(200);

  const callbackResponse = await supertestWithoutAuth
    .get(
      `${getUrlPrefix(spaceId)}/api/actions/connector/_oauth_callback?code=${encodeURIComponent(
        authCode
      )}&state=${startFlowResponse.state}`
    )
    .set('Cookie', sessionCookie)
    .redirects(0)
    .expect(302);

  const location = callbackResponse.headers.location;
  expect(location).to.contain('oauth_authorization=success');
  expect(location).to.contain('status_code=200');
}
