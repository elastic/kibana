/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isNumber, map, pickBy } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/api';
import { PARAMETER_NOT_FOUND } from '../../../common/translations/errors';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { replaceParamsQuery } from '../../../common/utils/replace_params_query';
import { isSavedQueryPrebuilt } from '../../routes/saved_query/utils';

interface CreateDynamicQueriesParams {
  params: CreateLiveQueryRequestBodySchema;
  alertData?: ParsedTechnicalFields;
  agents: string[];
  osqueryContext: OsqueryAppContext;
  error?: string;
}

export const createDynamicQueries = async ({
  params,
  alertData,
  agents,
  osqueryContext,
  error,
}: CreateDynamicQueriesParams) =>
  params.queries?.length
    ? map(params.queries, ({ query, ...restQuery }) => {
        const replacedQuery = replacedQueries(query, alertData);

        return pickBy(
          {
            ...replacedQuery,
            ...restQuery,
            ...(error ? { error } : {}),
            action_id: uuidv4(),
            alert_ids: params.alert_ids,
            agents,
          },
          (value) => !isEmpty(value) || value === true || isNumber(value)
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
            timeout: params.timeout,
            agents,
            ...(error ? { error } : {}),
          },
          (value) => !isEmpty(value) || isNumber(value)
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
