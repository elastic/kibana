/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState } from '../lib';
import { FindOptions, FindResult } from '../alerts_client';
import { RewriteRequestCase, RewriteResponseCase, verifyAccessAndContext } from './lib';
import { AlertTypeParams, AlertingRequestHandlerContext, BASE_ALERTING_API_PATH } from '../types';

// query definition
const querySchema = schema.object({
  per_page: schema.number({ defaultValue: 10, min: 0 }),
  page: schema.number({ defaultValue: 1, min: 1 }),
  search: schema.maybe(schema.string()),
  default_search_operator: schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
    defaultValue: 'OR',
  }),
  search_fields: schema.maybe(schema.oneOf([schema.arrayOf(schema.string()), schema.string()])),
  sort_field: schema.maybe(schema.string()),
  sort_order: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
  has_reference: schema.maybe(
    // use nullable as maybe is currently broken
    // in config-schema
    schema.nullable(
      schema.object({
        type: schema.string(),
        id: schema.string(),
      })
    )
  ),
  fields: schema.maybe(schema.arrayOf(schema.string())),
  filter: schema.maybe(schema.string()),
});

const rewriteQueryReq: RewriteRequestCase<FindOptions> = ({
  default_search_operator: defaultSearchOperator,
  has_reference: hasReference,
  search_fields: searchFields,
  per_page: perPage,
  sort_field: sortField,
  sort_order: sortOrder,
  ...rest
}) => ({
  ...rest,
  defaultSearchOperator,
  perPage,
  ...(sortField ? { sortField } : {}),
  ...(sortOrder ? { sortOrder } : {}),
  ...(hasReference ? { hasReference } : {}),
  ...(searchFields ? { searchFields } : {}),
});
const rewriteBodyRes: RewriteResponseCase<FindResult<AlertTypeParams>> = ({
  perPage,
  data,
  ...restOfResult
}) => {
  return {
    ...restOfResult,
    per_page: perPage,
    data: data.map(
      ({
        alertTypeId,
        createdBy,
        updatedBy,
        createdAt,
        updatedAt,
        apiKeyOwner,
        notifyWhen,
        muteAll,
        mutedInstanceIds,
        executionStatus,
        actions,
        scheduledTaskId,
        ...rest
      }) => ({
        ...rest,
        rule_type_id: alertTypeId,
        created_by: createdBy,
        updated_by: updatedBy,
        created_at: createdAt,
        updated_at: updatedAt,
        api_key_owner: apiKeyOwner,
        notify_when: notifyWhen,
        mute_all: muteAll,
        muted_alert_ids: mutedInstanceIds,
        scheduled_task_id: scheduledTaskId,
        execution_status: executionStatus && {
          ...omit(executionStatus, 'lastExecutionDate'),
          last_execution_date: executionStatus.lastExecutionDate,
        },
        actions: actions.map(({ group, id, actionTypeId, params }) => ({
          group,
          id,
          params,
          connector_type_id: actionTypeId,
        })),
      })
    ),
  };
};

export const findRulesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ALERTING_API_PATH}/rules/_find`,
      validate: {
        query: querySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertsClient = context.alerting.getAlertsClient();

        const options = rewriteQueryReq({
          ...req.query,
          has_reference: req.query.has_reference || undefined,
          search_fields: searchFieldsAsArray(req.query.search_fields),
        });

        const findResult = await alertsClient.find({ options });
        return res.ok({
          body: rewriteBodyRes(findResult),
        });
      })
    )
  );
};

function searchFieldsAsArray(searchFields: string | string[] | undefined): string[] | undefined {
  if (!searchFields) {
    return;
  }
  return Array.isArray(searchFields) ? searchFields : [searchFields];
}
