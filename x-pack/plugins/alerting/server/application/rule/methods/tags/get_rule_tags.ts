/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { KueryNode, nodeBuilder, nodeTypes } from '@kbn/es-query';
import { findRulesSo } from '../../../../data/rule/methods/find_rules_so';
import { ruleTagsParamsSchema, RuleTagsParams, RuleTagsAggregationResult } from '.';
import type { RuleTagsFormattedResponse } from '../../../../../common/routes/rule/apis/tags';
import { DEFAULT_TAGS_PER_PAGE } from '../../../../../common/routes/rule/apis/tags/constants/latest';
import { RulesClientContext } from '../../../../rules_client/types';
import { AlertingAuthorizationEntity } from '../../../../authorization';
import { alertingAuthorizationFilterOpts } from '../../../../rules_client/common/constants';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';

const MAX_TAGS = 10000;

export async function getRuleTags(
  context: RulesClientContext,
  params: RuleTagsParams
): Promise<RuleTagsFormattedResponse> {
  let validatedParams: RuleTagsParams;

  try {
    validatedParams = ruleTagsParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Failed to validate params: ${error.message}`);
  }

  const { page, perPage = DEFAULT_TAGS_PER_PAGE, search = '' } = validatedParams;

  let authorizationTuple;
  try {
    authorizationTuple = await context.authorization.getFindAuthorizationFilter(
      AlertingAuthorizationEntity.Rule,
      alertingAuthorizationFilterOpts
    );
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.AGGREGATE,
        error,
      })
    );
    throw error;
  }

  const { filter: authorizationFilter } = authorizationTuple;

  const filter =
    authorizationFilter && search
      ? nodeBuilder.and([
          nodeBuilder.is('alert.attributes.tags', nodeTypes.wildcard.buildNode(`${search}*`)),
          authorizationFilter as KueryNode,
        ])
      : authorizationFilter;

  const response = await findRulesSo<RuleTagsAggregationResult>({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsFindOptions: {
      filter,
      aggs: {
        tags: {
          terms: {
            field: 'alert.attributes.tags',
            order: {
              _key: 'asc',
            },
            size: MAX_TAGS,
          },
        },
      },
    },
  });

  const filteredTags = (response.aggregations?.tags?.buckets || []).reduce<string[]>(
    (result, bucket) => {
      if (bucket.key.startsWith(search)) {
        result.push(bucket.key);
      }
      return result;
    },
    []
  );

  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const chunkedTags = filteredTags.slice(startIndex, endIndex);

  return {
    total: filteredTags.length,
    page,
    perPage,
    data: chunkedTags,
  };
}
