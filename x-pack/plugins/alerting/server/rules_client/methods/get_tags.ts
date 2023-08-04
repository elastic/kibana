/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { TypeOf, schema } from '@kbn/config-schema';
import { KueryNode, nodeBuilder, nodeTypes } from '@kbn/es-query';
import { RulesClientContext } from '../types';
import { AlertingAuthorizationEntity } from '../../authorization';
import { alertingAuthorizationFilterOpts } from '../common/constants';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RawRule } from '../../types';

export const DEFAULT_TAGS_PER_PAGE = 50;
const MAX_TAGS = 10000;

const getTagsParamsSchema = schema.object({
  page: schema.number({ defaultValue: 1, min: 1 }),
  perPage: schema.maybe(schema.number({ defaultValue: DEFAULT_TAGS_PER_PAGE, min: 1 })),
  search: schema.maybe(schema.string()),
});

export type GetTagsParams = TypeOf<typeof getTagsParamsSchema>;

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
  params: GetTagsParams
): Promise<GetTagsResult> {
  let validatedParams: GetTagsParams;

  try {
    validatedParams = getTagsParamsSchema.validate(params);
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
