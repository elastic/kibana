/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import qs from 'qs';
import atob from 'atob';
import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import axios, { AxiosResponse } from 'axios';
import { ILicenseState } from '../lib';
import { BASE_ACTION_API_PATH, RewriteResponseCase } from '../../common';
import { ActionsRequestHandlerContext } from '../types';
import { verifyAccessAndContext } from './verify_access_and_context';

const querySchema = schema.object({
  code: schema.maybe(schema.string()),
  state: schema.maybe(schema.string()),
  session_state: schema.maybe(schema.string()),
  scope: schema.maybe(schema.string()),
});

interface OAuthResult {
  accessToken: string;
  refreshToken: string;
  expires?: string;
  scope?: string;
  tokenType?: string;
}

const rewriteBodyRes: RewriteResponseCase<OAuthResult> = ({
  accessToken,
  refreshToken,
  expires,
  tokenType,
  ...res
}) => ({
  ...res,
  access_token: accessToken,
  refresh_token: refreshToken,
  expires_in: expires,
  token_type: tokenType,
});

export const oauthActionRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ACTION_API_PATH}/connector/oauth_code`,
      validate: {
        query: querySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const { code, state, scope } = req.query;
        return res.ok({
          body: rewriteBodyRes(await getAccessToken2(code, scope, state)),
        });
      })
    )
  );
};

async function getAccessToken2(
  code?: string,
  scope?: string,
  state?: string
): Promise<OAuthResult> {
  const stateObj = JSON.parse(atob(state!));
  const tokenUrl: string = stateObj.tokenUrl;
  const res = await postAuthToken(tokenUrl, {
    code,
    state,
    scope,
    access_type: 'offline',
    grant_type: 'authorization_code',
    client_id: stateObj.client_id,
    client_secret: stateObj.client_secret,
    redirect_uri: stateObj.redirect_uri,
  });
  return {
    accessToken: res.data.access_token,
    refreshToken: res.data.refresh_token ?? 'lals',
    expires: res.data.expires_in,
    scope: res.data.scope,
    tokenType: res.data.token_type,
  };
}

export async function postAuthToken(
  tokenUrl: string,
  obj: {
    code?: string;
    scope?: string;
    state?: string;
    client_id?: string;
    client_secret?: string;
    grant_type?: string;
    redirect_uri?: string;
    access_type?: string;
  }
): Promise<AxiosResponse> {
  const axiosInstance = axios.create();
  return await axiosInstance(tokenUrl, {
    method: 'post',
    data: qs.stringify(obj),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  });
}
