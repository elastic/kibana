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
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { trackLegacyTerminology } from '../../../lib/track_legacy_terminology';
import {
  aggregateRulesRequestBodySchemaV1,
  AggregateRulesRequestBodyV1,
} from '../../../../../common/routes/rule/apis/aggregate';
import { formatDefaultAggregationResultV1 } from './transforms';
import { transformAggregateQueryRequestV1, transformAggregateBodyResponseV1 } from './transforms';
import { DefaultRuleAggregationResultV1 } from './types';
import { getDefaultRuleAggregationV1 } from './factories/get_default_rule_aggregation';

export const aggregateRulesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_aggregate`,
      validate: {
        body: aggregateRulesRequestBodySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const body: AggregateRulesRequestBodyV1 = req.body;
        const options = transformAggregateQueryRequestV1({
          ...body,
          has_reference: body.has_reference || undefined,
        });
        trackLegacyTerminology(
          [body.search, body.search_fields].filter(Boolean) as string[],
          usageCounter
        );

        const aggregateResult = await rulesClient.aggregate<DefaultRuleAggregationResultV1>({
          aggs: getDefaultRuleAggregationV1(),
          options,
        });
        return res.ok({
          body: transformAggregateBodyResponseV1(formatDefaultAggregationResultV1(aggregateResult)),
        });
      })
    )
  );
};
