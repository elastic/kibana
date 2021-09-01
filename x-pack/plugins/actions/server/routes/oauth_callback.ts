/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import qs from 'qs';
import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import axios, { AxiosResponse } from 'axios';
import { ILicenseState } from '../lib';
import { BASE_ACTION_API_PATH, RewriteResponseCase } from '../../common';
import { ActionsRequestHandlerContext } from '../types';
import { verifyAccessAndContext } from './verify_access_and_context';

const querySchema = schema.object({
  state: schema.maybe(schema.string()),
  admin_consent: schema.maybe(schema.string()),
  tenant: schema.maybe(schema.string()),
});

interface OAuthResult {
  accessToken: string;
  expires?: string;
  scope?: string;
  tokenType?: string;
}

const rewriteBodyRes: RewriteResponseCase<OAuthResult> = ({
  accessToken,
  expires,
  tokenType,
  ...res
}) => ({
  ...res,
  access_token: accessToken,
  expires_in: expires,
  token_type: tokenType,
});

export const oauthActionRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ACTION_API_PATH}/connector/oauth_callback`,
      validate: {
        query: querySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const { state } = req.query;
        return res.ok({
          body: rewriteBodyRes(await getAccessToken2(state)),
        });
      })
    )
  );
};

async function getAccessToken2(state?: string): Promise<OAuthResult> {
  const stateObj = JSON.parse(atob(state!));
  const tenantId: string = stateObj.tenantId;
  const res = await postAuthToken(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
      client_id: stateObj.client_id,
      client_secret: stateObj.client_secret,
    }
  );
  return {
    accessToken: res.data.access_token,
    expires: res.data.expires_in,
    tokenType: res.data.token_type,
  };
}

export async function postAuthToken(
  tokenUrl: string,
  obj: {
    scope?: string;
    client_id?: string;
    client_secret?: string;
    grant_type?: string;
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

function atob(str: string) {
  return Buffer.from(str, 'base64').toString('binary');
}
