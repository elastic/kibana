/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';

import { ILicenseState } from '../lib';
import { verifyAccessAndContext, rewriteRule } from './lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';

const ruleActionSchema = schema.object({
  group: schema.string(),
  id: schema.string(),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
});

const operationsSchema = schema.arrayOf(
  schema.oneOf([
    schema.object({
      operation: schema.oneOf([
        schema.literal('add'),
        schema.literal('delete'),
        schema.literal('set'),
      ]),
      field: schema.literal('tags'),
      value: schema.arrayOf(schema.string()),
    }),
    schema.object({
      operation: schema.oneOf([schema.literal('add'), schema.literal('set')]),
      field: schema.literal('actions'),
      value: schema.arrayOf(ruleActionSchema),
    }),
  ]),
  { minSize: 1 }
);

const bodySchema = schema.object({
  filter: schema.maybe(schema.string()),
  ids: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1 })),
  operations: operationsSchema,
});

interface BuildBulkEditRulesRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
}

const buildBulkEditRulesRoute = ({ licenseState, path, router }: BuildBulkEditRulesRouteParams) => {
  router.post(
    {
      path,
      validate: {
        body: bodySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = context.alerting.getRulesClient();
        const { filter, operations, ids } = req.body;

        const bulkEditResults = await rulesClient.bulkEdit({
          filter,
          ids: ids as string[],
          operations,
        });
        return res.ok({
          body: { ...bulkEditResults, rules: bulkEditResults.rules.map(rewriteRule) },
        });
      })
    )
  );
};

export const bulkEditInternalRulesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildBulkEditRulesRoute({
    licenseState,
    path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_bulk_edit`,
    router,
  });
