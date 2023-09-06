/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { KueryNode, nodeBuilder, nodeTypes } from '@kbn/es-query';
import { ruleTagsParamsSchema } from '../../application/rule/schemas';
import { RuleTagsParams } from '../../application/rule/types';
import { DEFAULT_TAGS_PER_PAGE } from '../../../common/routes/rule/apis/tags';
import { RulesClientContext } from '../types';
import { AlertingAuthorizationEntity } from '../../authorization';
import { alertingAuthorizationFilterOpts } from '../common/constants';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
// FIXME: import { RuleAttributes } from '../../../../data/rule/types';
import { RawRule } from '../../types';

const MAX_TAGS = 10000;

export interface RuleTagsAggregationResult {
  tags: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

export interface GetTagsResult {
  total: number;
  page: number;
  perPage: number;
  data: string[];
}

export async function getTags(
  context: RulesClientContext,
  params: RuleTagsParams
): Promise<GetTagsResult> {
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

  const response = await context.unsecuredSavedObjectsClient.find<
    RawRule,
    RuleTagsAggregationResult
  >({
    filter,
    type: 'alert',
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
