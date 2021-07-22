/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { remove } from 'lodash';
import { JsonObject } from '@kbn/common-utils';
import { EsQueryConfig, nodeBuilder, toElasticsearchQuery, KueryNode } from '@kbn/es-query';

import { RegistryAlertTypeWithAuth } from './alerting_authorization';

export enum AlertingAuthorizationFilterType {
  KQL = 'kql',
  ESDSL = 'dsl',
}

export interface AlertingAuthorizationFilterOpts {
  type: AlertingAuthorizationFilterType;
  fieldNames: AlertingAuthorizationFilterFieldNames;
  includeSpaceId: boolean;
}

interface AlertingAuthorizationFilterFieldNames {
  ruleTypeId: string;
  consumer: string;
  spaceIds?: string;
}

const esQueryConfig: EsQueryConfig = {
  allowLeadingWildcards: true,
  dateFormatTZ: 'Zulu',
  ignoreFilterIfFieldNotInIndex: false,
  queryStringOptions: { analyze_wildcard: true },
};

export function asFiltersByRuleTypeAndConsumer(
  ruleTypes: Set<RegistryAlertTypeWithAuth>,
  opts: AlertingAuthorizationFilterOpts,
  spaceId: string | undefined
): KueryNode | JsonObject {
  const kueryNode = nodeBuilder.or(
    Array.from(ruleTypes).reduce<KueryNode[]>((filters, { id, authorizedConsumers }) => {
      ensureFieldIsSafeForQuery('ruleTypeId', id);
      const andNodes = [
        nodeBuilder.is(opts.fieldNames.ruleTypeId, id),
        nodeBuilder.or(
          Object.keys(authorizedConsumers).map((consumer) => {
            ensureFieldIsSafeForQuery('consumer', consumer);
            return nodeBuilder.is(opts.fieldNames.consumer, consumer);
          })
        ),
      ];

      if (opts.includeSpaceId && opts.fieldNames.spaceIds != null && spaceId != null) {
        andNodes.push(nodeBuilder.is(opts.fieldNames.spaceIds, spaceId));
      }

      filters.push(nodeBuilder.and(andNodes));

      return filters;
    }, [])
  );

  if (ruleTypes.size === 0 && opts.includeSpaceId && spaceId != null) {
    return toElasticsearchQuery(
      nodeBuilder.is(opts.fieldNames.spaceIds, spaceId),
      undefined,
      esQueryConfig
    );
  }

  if (opts.type === AlertingAuthorizationFilterType.ESDSL) {
    return toElasticsearchQuery(kueryNode, undefined, esQueryConfig);
  }

  return kueryNode;
}

export function ensureFieldIsSafeForQuery(field: string, value: string): boolean {
  const invalid = value.match(/([>=<\*:()]+|\s+)/g);
  if (invalid) {
    const whitespace = remove(invalid, (chars) => chars.trim().length === 0);
    const errors = [];
    if (whitespace.length) {
      errors.push(`whitespace`);
    }
    if (invalid.length) {
      errors.push(`invalid character${invalid.length > 1 ? `s` : ``}: ${invalid?.join(`, `)}`);
    }
    throw new Error(`expected ${field} not to include ${errors.join(' and ')}`);
  }
  return true;
}
