/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import { API_MIGRATE_ILM_POLICY_URL } from '../../common/constants';
import { ReportingCore } from '../core';
import { LevelLogger as Logger } from '../lib';

export const registerDeprecationsRoutes = (reporting: ReportingCore, logger: Logger) => {
  const { router } = reporting.getPluginSetupDeps();

  router.put({ path: API_MIGRATE_ILM_POLICY_URL, validate: false }, async (ctx, req, res) => {
    const store = await reporting.getStore();
    const { asInternalUser: client } = await reporting.getEsClient();

    const indexPattern = store.getReportingIndexPattern();
    const reportingIlmPolicy = store.getIlmPolicyName();

    try {
      await client.indices.putSettings({
        index: indexPattern,
        body: {
          index: {
            lifecycle: {
              name: reportingIlmPolicy,
            },
          },
        },
      });
      return res.ok();
    } catch (err) {
      logger.error(err);

      if (err instanceof errors.ResponseError) {
        return res.customError({
          statusCode: 500,
          body: {
            message: err.message,
            name: err.name,
          },
        });
      }

      throw err;
    }
  });
};
