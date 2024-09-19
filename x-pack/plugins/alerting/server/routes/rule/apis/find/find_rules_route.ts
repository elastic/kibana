/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import { findRulesRequestQuerySchemaV1 } from '../../../../../common/routes/rule/apis/find';
import type {
  FindRulesRequestQueryV1,
  FindRulesResponseV1,
} from '../../../../../common/routes/rule/apis/find';
import { RuleParamsV1, ruleResponseSchemaV1 } from '../../../../../common/routes/rule/response';
import {
  AlertingRequestHandlerContext,
  BASE_ALERTING_API_PATH,
  INTERNAL_ALERTING_API_FIND_RULES_PATH,
} from '../../../../types';
import { trackLegacyTerminology } from '../../../lib/track_legacy_terminology';
import { transformFindRulesBodyV1, transformFindRulesResponseV1 } from './transforms';

interface BuildFindRulesRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
  excludeFromPublicApi?: boolean;
  usageCounter?: UsageCounter;
}

const buildFindRulesRoute = ({
  licenseState,
  path,
  router,
  excludeFromPublicApi = false,
  usageCounter,
}: BuildFindRulesRouteParams) => {
  router.get(
    {
      path,
      options: {
        access: 'public',
        summary: 'Get information about rules',
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {
          query: findRulesRequestQuerySchemaV1,
        },
        response: {
          200: {
            body: () => ruleResponseSchemaV1,
            description: 'Indicates a successful call.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();

        const query: FindRulesRequestQueryV1 = req.query;

        trackLegacyTerminology(
          [query.search, query.search_fields, query.sort_field].filter(Boolean) as string[],
          usageCounter
        );

        const options = transformFindRulesBodyV1({
          ...query,
          has_reference: query.has_reference || undefined,
          search_fields: searchFieldsAsArray(query.search_fields),
        });

        if (req.query.fields) {
          usageCounter?.incrementCounter({
            counterName: `alertingFieldsUsage`,
            counterType: 'alertingFieldsUsage',
            incrementBy: 1,
          });
        }

        const findResult = await rulesClient.find({
          options,
          excludeFromPublicApi,
          includeSnoozeData: true,
        });

        const responseBody: FindRulesResponseV1<RuleParamsV1>['body'] =
          transformFindRulesResponseV1<RuleParamsV1>(findResult, options.fields);

        return res.ok({
          body: responseBody,
        });
      })
    )
  );
  if (path === INTERNAL_ALERTING_API_FIND_RULES_PATH) {
    router.post(
      {
        path,
        options: { access: 'internal' },
        validate: {
          body: findRulesRequestQuerySchemaV1,
        },
      },
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = (await context.alerting).getRulesClient();

          const body: FindRulesRequestQueryV1 = req.body;

          trackLegacyTerminology(
            [req.body.search, req.body.search_fields, req.body.sort_field].filter(
              Boolean
            ) as string[],
            usageCounter
          );

          const options = transformFindRulesBodyV1({
            ...body,
            has_reference: body.has_reference || undefined,
            search_fields: searchFieldsAsArray(body.search_fields),
          });

          if (req.body.fields) {
            usageCounter?.incrementCounter({
              counterName: `alertingFieldsUsage`,
              counterType: 'alertingFieldsUsage',
              incrementBy: 1,
            });
          }

          const findResult = await rulesClient.find({
            options,
            excludeFromPublicApi,
            includeSnoozeData: true,
          });

          const responseBody: FindRulesResponseV1<RuleParamsV1>['body'] =
            transformFindRulesResponseV1<RuleParamsV1>(findResult, options.fields);

          return res.ok({
            body: responseBody,
          });
        })
      )
    );
  }
};

export const findRulesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  buildFindRulesRoute({
    excludeFromPublicApi: true,
    licenseState,
    path: `${BASE_ALERTING_API_PATH}/rules/_find`,
    router,
    usageCounter,
  });
};

export const findInternalRulesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  buildFindRulesRoute({
    excludeFromPublicApi: false,
    licenseState,
    path: INTERNAL_ALERTING_API_FIND_RULES_PATH,
    router,
    usageCounter,
  });
};

function searchFieldsAsArray(searchFields: string | string[] | undefined): string[] | undefined {
  if (!searchFields) {
    return;
  }
  return Array.isArray(searchFields) ? searchFields : [searchFields];
}
