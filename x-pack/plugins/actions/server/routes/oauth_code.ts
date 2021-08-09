/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { ILicenseState } from '../lib';
import { BASE_ACTION_API_PATH, RewriteResponseCase } from '../../common';
import { ActionResult, ActionsRequestHandlerContext } from '../types';
import { verifyAccessAndContext } from './verify_access_and_context';

const querySchema = schema.object({
  code: schema.string(),
  state: schema.maybe(schema.string()),
  session_state: schema.maybe(schema.string()),
});

interface OAuthResult {
  accessToken: string;
  refreshToken: string;
  expires?: string;
}

const rewriteBodyRes: RewriteResponseCase<OAuthResult> = ({
  accessToken,
  refreshToken,
  ...res
}) => ({
  ...res,
  access_token: accessToken,
  refresh_token: refreshToken,
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
        const { code, state } = req.query;
        return res.ok({
          body: rewriteBodyRes(getAccessToken(code, state)),
        });
      })
    )
  );
};

function getAccessToken(code: string, state?: string): OAuthResult {
  const res = {
    accessToken: 'sdsd',
    refreshToken: 'jfhsdjkfsdjkfhjksdhf',
  };
  return res;
}
