/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import {
  API_MIGRATE_ILM_POLICY_URL,
  API_GET_ILM_POLICY_STATUS,
  API_CREATE_ILM_POLICY_URL,
  ILM_POLICY_NAME,
} from '../../common/constants';
import { deprecations } from '../lib/deprecations';
import { ReportingCore } from '../core';
import { ReportingIlmPolicyManager, LevelLogger as Logger } from '../lib';

interface IlmPolicyStatusResponse {
  status: 'ok' | 'indices-migration-needed' | 'reporting-policy-not-found';
}

export const registerDeprecationsRoutes = (reporting: ReportingCore, logger: Logger) => {
  const { router } = reporting.getPluginSetupDeps();

  router.get(
    {
      path: API_GET_ILM_POLICY_STATUS,
      validate: false,
    },
    async (
      {
        core: {
          elasticsearch: { client: scopedClient },
        },
      },
      req,
      res
    ) => {
      const reportingIlmPolicyManager = ReportingIlmPolicyManager.create({
        client: scopedClient.asCurrentUser,
      });

      const shouldMigrateIndices = () => {
        return deprecations.shouldMigrateIndices({
          reportingCore: reporting,
          // We want to make the current status visible to all reporting users
          elasticsearchClient: scopedClient.asInternalUser,
        });
      };

      try {
        let status: IlmPolicyStatusResponse['status'];

        if (!(await reportingIlmPolicyManager.doesIlmPolicyExist())) {
          status = 'reporting-policy-not-found';
        } else if (await shouldMigrateIndices()) {
          status = 'indices-migration-needed';
        } else {
          status = 'ok';
        }
        const response: IlmPolicyStatusResponse = {
          status,
        };
        return res.ok({ body: response });
      } catch (e) {
        return res.customError({ statusCode: e?.statusCode ?? 500, body: { message: e.message } });
      }
    }
  );

  router.post(
    {
      path: API_CREATE_ILM_POLICY_URL,
      validate: false,
    },
    async (
      {
        core: {
          elasticsearch: { client: scopedClient },
        },
      },
      req,
      res
    ) => {
      const reportingIlmPolicyManager = ReportingIlmPolicyManager.create({
        client: scopedClient.asCurrentUser,
      });

      try {
        await reportingIlmPolicyManager.createIlmPolicy();
        return res.ok();
      } catch (e) {
        return res.customError({ statusCode: e?.statusCode ?? 500, body: { message: e.message } });
      }
    }
  );

  router.put(
    { path: API_MIGRATE_ILM_POLICY_URL, validate: false },
    async ({ core: { elasticsearch } }, req, res) => {
      const store = await reporting.getStore();
      const {
        client: { asCurrentUser: client },
      } = elasticsearch;

      const indexPattern = store.getReportingIndexPattern();

      try {
        await client.indices.putSettings({
          index: indexPattern,
          body: {
            'index.lifecycle': {
              name: ILM_POLICY_NAME,
            },
          },
        });
        return res.ok();
      } catch (err) {
        logger.error(err);

        if (err instanceof errors.ResponseError) {
          return res.customError({
            statusCode: err.statusCode ?? 500,
            body: {
              message: err.message,
              name: err.name,
            },
          });
        }

        throw err;
      }
    }
  );
};
