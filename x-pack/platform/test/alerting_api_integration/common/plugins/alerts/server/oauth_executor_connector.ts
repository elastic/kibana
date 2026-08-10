/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionType } from '@kbn/actions-plugin/server';
import type { PluginSetupContract as ActionsPluginSetup } from '@kbn/actions-plugin/server/plugin';
import { z } from '@kbn/zod/v4';

const oauthExecutorConfigSchema = z
  .object({
    echoUrl: z.url(),
  })
  .strict();

type OauthExecutorConfig = z.infer<typeof oauthExecutorConfigSchema>;

const oauthExecutorParamsSchema = z.object({}).strict().default({});

type OauthExecutorParams = z.infer<typeof oauthExecutorParamsSchema>;

interface OauthExecutorEchoData {
  receivedAuth: string | null;
}

export const getOAuthExecutorActionType = (
  actions: ActionsPluginSetup
): ActionType<
  OauthExecutorConfig,
  Record<string, unknown>,
  OauthExecutorParams,
  OauthExecutorEchoData
> => {
  return {
    id: 'test.oauth-executor',
    name: 'Test: OAuth executor connector',
    minimumLicenseRequired: 'platinum',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: oauthExecutorConfigSchema },
      // Framework validates OAuth secrets (clientId, clientSecret, tokenUrl, authorizationUrl) on flow start/callback; this schema does not duplicate that.
      secrets: { schema: z.any() },
      params: { schema: oauthExecutorParamsSchema },
    },
    async executor({ actionId, config, secrets, services, profileUid, authMode }) {
      const axiosInstance = await actions.getAxiosInstanceWithAuth({
        connectorId: actionId,
        // `z.any()` does not narrow to the record shape `getAxiosInstanceWithAuth` expects.
        secrets: secrets as Record<string, unknown>,
        connectorTokenClient: services.connectorTokenClient,
        profileUid,
        authMode,
      });
      const { data } = await axiosInstance.post<OauthExecutorEchoData>(config.echoUrl, {});
      return { status: 'ok', data, actionId };
    },
  };
};
