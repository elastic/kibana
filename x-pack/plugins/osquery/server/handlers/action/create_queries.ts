/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, map, pickBy } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';

import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/schemas/routes/live_query';
import { replaceParamsQuery } from '../../../common/utils/replace_params_query';
import { isSavedQueryPrebuilt } from '../../routes/saved_query/utils';

export const PARAMETER_NOT_FOUND = i18n.translate(
  'xpack.osquery.liveQueryActions.error.notFoundParameters',
  {
    defaultMessage:
      "This query hasn't been called due to parameter used and its value not found in the alert.",
  }
);

interface CreateDynamicQueriesParams {
  params: CreateLiveQueryRequestBodySchema;
  alertData?: ParsedTechnicalFields;
  agents: string[];
  osqueryContext: OsqueryAppContext;
}
export const createDynamicQueries = async ({
  params,
  alertData,
  agents,
  osqueryContext,
}: CreateDynamicQueriesParams) =>
  params.queries?.length
    ? map(params.queries, ({ query, ...restQuery }) => {
        const replacedQuery = replacedQueries(query, alertData);

        return pickBy(
          {
            ...replacedQuery,
            ...restQuery,
            action_id: uuidv4(),
            alert_ids: params.alert_ids,
            agents,
          },
          (value) => !isEmpty(value) || value === true
        );
      })
    : [
        pickBy(
          {
            action_id: uuidv4(),
            id: uuidv4(),
            ...replacedQueries(params.query, alertData),
            saved_query_id: params.saved_query_id,
            saved_query_prebuilt: params.saved_query_id
              ? await isSavedQueryPrebuilt(
                  osqueryContext.service.getPackageService()?.asInternalUser,
                  params.saved_query_id
                )
              : undefined,
            ecs_mapping: params.ecs_mapping,
            alert_ids: params.alert_ids,
            agents,
          },
          (value) => !isEmpty(value)
        ),
      ];

export const replacedQueries = (
  query: string | undefined,
  alertData?: ParsedTechnicalFields
): { query: string | undefined; error?: string } => {
  if (alertData && query) {
    const { result, skipped } = replaceParamsQuery(query, alertData);

    return {
      query: result,
      ...(skipped
        ? {
            error: PARAMETER_NOT_FOUND,
          }
        : {}),
    };
  }

  return { query };
};
