/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { remove } from 'lodash';
import { JsonObject } from '../../../../../src/plugins/kibana_utils/common';
import { nodeBuilder, EsQueryConfig } from '../../../../../src/plugins/data/common';
import { toElasticsearchQuery } from '../../../../../src/plugins/data/common/es_query';
import { KueryNode } from '../../../../../src/plugins/data/server';
import { RegistryAlertTypeWithAuth } from './alerts_authorization';

export enum AlertingAuthorizationFilterType {
  KQL = 'kql',
  ESDSL = 'dsl',
}

export interface FilterFieldNames {
  ruleTypeId: string;
  consumer: string;
}

const esQueryConfig: EsQueryConfig = {
  allowLeadingWildcards: true,
  dateFormatTZ: 'Zulu',
  ignoreFilterIfFieldNotInIndex: false,
  queryStringOptions: { analyze_wildcard: true },
};

// pass in the field name instead of hardcoding `alert.attributes.alertTypeId` and `alertTypeId`
export function asFiltersByRuleTypeAndConsumer(
  ruleTypes: Set<RegistryAlertTypeWithAuth>,
  filterFieldNames: FilterFieldNames,
  filterType: AlertingAuthorizationFilterType
): KueryNode | JsonObject {
  const kueryNode = nodeBuilder.or(
    Array.from(ruleTypes).reduce<KueryNode[]>((filters, { id, authorizedConsumers }) => {
      ensureFieldIsSafeForQuery('ruleTypeId', id);
      filters.push(
        nodeBuilder.and([
          nodeBuilder.is(filterFieldNames.ruleTypeId, id),
          nodeBuilder.or(
            Object.keys(authorizedConsumers).map((consumer) => {
              ensureFieldIsSafeForQuery('consumer', consumer);
              return nodeBuilder.is(filterFieldNames.consumer, consumer);
            })
          ),
        ])
      );
      return filters;
    }, [])
  );

  if (filterType === AlertingAuthorizationFilterType.ESDSL) {
    return toElasticsearchQuery(kueryNode, undefined, esQueryConfig);
  }

  return kueryNode;
}

export function asKqlFiltersByRuleTypeAndConsumer(
  ruleTypes: Set<RegistryAlertTypeWithAuth>,
  filterFieldNames: FilterFieldNames
): KueryNode {
  return asFiltersByRuleTypeAndConsumer(
    ruleTypes,
    filterFieldNames,
    AlertingAuthorizationFilterType.KQL
  ) as KueryNode;
}

export function asEsDslFiltersByRuleTypeAndConsumer(
  ruleTypes: Set<RegistryAlertTypeWithAuth>,
  filterFieldNames: FilterFieldNames
): JsonObject {
  return asFiltersByRuleTypeAndConsumer(
    ruleTypes,
    filterFieldNames,
    AlertingAuthorizationFilterType.ESDSL
  ) as JsonObject;
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
