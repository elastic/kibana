/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type SuperTest from 'supertest';
import { type Cookie, parse as parseCookie } from 'tough-cookie';

import { adminTestUser } from '@kbn/test';

/**
 * Result type for login operations containing the session cookie and user profile ID.
 */
export interface LoginResult {
  cookie: Cookie;
  profileUid: string;
}

/**
 * Creates a simple test user with specified roles.
 * The user is created with username 'simple_user' and password 'changeme'.
 *
 * @param es - Elasticsearch client instance
 * @param roles - Array of role names to assign to the user (defaults to ['viewer'])
 */
export const createSimpleUser = async (es: Client, roles: string[] = ['viewer']) => {
  await es.security.putUser({
    username: 'simple_user',
    refresh: 'wait_for',
    password: 'changeme',
    roles,
  });
};

/**
 * Performs a login operation and returns the session cookie and user profile ID.
 *
 * @param supertestWithoutAuth - Supertest instance without authentication
 * @param username - Username to login with
 * @param password - Password for the user
 * @returns Object containing the session cookie and user profile UID
 */
export const login = async (
  supertestWithoutAuth: SuperTest.Agent,
  username: string,
  password: string | undefined
): Promise<LoginResult> => {
  const response = await supertestWithoutAuth
    .post('/internal/security/login')
    .set('kbn-xsrf', 'xxx')
    .send({
      providerType: 'basic',
      providerName: 'basic',
      currentURL: '/',
      params: { username, password },
    })
    .expect(200);
  const cookie = parseCookie(response.headers['set-cookie'][0])!;
  const profileUidResponse = await supertestWithoutAuth
    .get('/internal/security/me')
    .set('Cookie', cookie.cookieString())
    .expect(200);
  return {
    cookie,
    profileUid: profileUidResponse.body.profile_uid,
  };
};

/**
 * Logs in as the Kibana admin user.
 *
 * @param supertestWithoutAuth - Supertest instance without authentication
 * @returns Object containing the session cookie and admin user profile UID
 */
export const loginAsKibanaAdmin = (supertestWithoutAuth: SuperTest.Agent): Promise<LoginResult> =>
  login(supertestWithoutAuth, adminTestUser.username, adminTestUser.password);

export const loginAsObjectOwner = (
  supertestWithoutAuth: SuperTest.Agent,
  username: string,
  password: string
): Promise<LoginResult> => login(supertestWithoutAuth, username, password);

export const loginAsNotObjectOwner = (
  supertestWithoutAuth: SuperTest.Agent,
  username: string,
  password: string
): Promise<LoginResult> => login(supertestWithoutAuth, username, password);

export const activateSimpleUserProfile = async (es: Client): Promise<{ profileUid: string }> => {
  const response = await es.security.activateUserProfile({
    username: 'simple_user',
    password: 'changeme',
    grant_type: 'password',
  });

  return {
    profileUid: response.uid,
  };
};
