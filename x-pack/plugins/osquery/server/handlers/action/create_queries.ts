/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, map, pickBy } from 'lodash';
import { v4 as uuid } from 'uuid';
import type { Ecs } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/schemas/routes/live_query';
import { replaceParamsQuery } from '../../../common/utils/replace_params_query';
import { isSavedQueryPrebuilt } from '../../routes/saved_query/utils';

export const createQueries = async (
  params: CreateLiveQueryRequestBodySchema,
  agents: string[],
  osqueryContext: OsqueryAppContext
) =>
  params.queries?.length
    ? map(params.queries, (query) =>
        pickBy(
          {
            ...query,
            action_id: uuid.v4(),
            agents,
          },
          (value) => !isEmpty(value) || value === true
        )
      )
    : [
        pickBy(
          {
            action_id: uuid.v4(),
            id: uuid.v4(),
            query: params.query,
            saved_query_id: params.saved_query_id,
            saved_query_prebuilt: params.saved_query_id
              ? await isSavedQueryPrebuilt(
                  osqueryContext.service.getPackageService()?.asInternalUser,
                  params.saved_query_id
                )
              : undefined,
            ecs_mapping: params.ecs_mapping,
            agents,
          },
          (value) => !isEmpty(value)
        ),
      ];

export const createDynamicQueries = async (
  params: CreateLiveQueryRequestBodySchema,
  alert: Ecs,
  osqueryContext: OsqueryAppContext
) =>
  params.queries?.length
    ? map(params.queries, ({ query, ...restQuery }) => {
        const replacedQuery = replacedQueries(query, alert);

        return pickBy(
          {
            ...replacedQuery,
            ...restQuery,
            action_id: uuid.v4(),
            alert_ids: params.alert_ids,
            agents: params.agent_ids,
          },
          (value) => !isEmpty(value) || value === true
        );
      })
    : [
        pickBy(
          {
            action_id: uuid.v4(),
            id: uuid.v4(),
            ...replacedQueries(params.query, alert),
            // just for single queries - we need to overwrite the error property
            error: undefined,
            saved_query_id: params.saved_query_id,
            saved_query_prebuilt: params.saved_query_id
              ? await isSavedQueryPrebuilt(
                  osqueryContext.service.getPackageService()?.asInternalUser,
                  params.saved_query_id
                )
              : undefined,
            ecs_mapping: params.ecs_mapping,
            alert_ids: params.alert_ids,
            agents: params.agent_ids,
          },
          (value) => !isEmpty(value)
        ),
      ];

const replacedQueries = (
  query: string | undefined,
  ecsData?: Ecs
): { query: string | undefined; error?: string } => {
  if (ecsData && query) {
    const { result, skipped } = replaceParamsQuery(query, ecsData);

    return {
      query: result,
      ...(skipped
        ? {
            error: i18n.translate('xpack.osquery.liveQueryActions.error.notFoundParameters', {
              defaultMessage:
                "This query hasn't been called due to parameter used and its value not found in the alert.",
            }),
          }
        : {}),
    };
  }

  return { query };
};
