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
  ILM_POLICY_NAME,
} from '../../common/constants';
import { IlmPolicyStatusResponse } from '../../common/types';
import { deprecations } from '../lib/deprecations';
import { ReportingCore } from '../core';
import { IlmPolicyManager, LevelLogger as Logger } from '../lib';

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
      const checkIlmMigrationStatus = () => {
        return deprecations.checkIlmMigrationStatus({
          reportingCore: reporting,
          // We want to make the current status visible to all reporting users
          elasticsearchClient: scopedClient.asInternalUser,
        });
      };

      try {
        const response: IlmPolicyStatusResponse = {
          status: await checkIlmMigrationStatus(),
        };
        return res.ok({ body: response });
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

      const scopedIlmPolicyManager = IlmPolicyManager.create({
        client,
      });

      // First we ensure that the reporting ILM policy exists in the cluster
      try {
        // We don't want to overwrite an existing reporting policy because it may contain alterations made by users
        if (!(await scopedIlmPolicyManager.doesIlmPolicyExist())) {
          await scopedIlmPolicyManager.createIlmPolicy();
        }
      } catch (e) {
        return res.customError({ statusCode: e?.statusCode ?? 500, body: { message: e.message } });
      }

      const indexPattern = store.getReportingIndexPattern();

      // Second we migrate all of the existing indices to be managed by the reporting ILM policy
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
          // If there were no reporting indices to update, that's OK because then there is nothing to migrate
          if (err.statusCode === 404) {
            return res.ok();
          }
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
