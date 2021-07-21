/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { remove } from 'lodash';

import { nodeBuilder } from '../../../../../src/plugins/data/common';
import { KueryNode } from '../../../../../src/plugins/data/server';
import { RegistryAlertTypeWithAuth } from './alerting_authorization';

export enum AlertingAuthorizationFilterType {
  KQL = 'kql',
  ESDSL = 'dsl',
}

export interface BooleanFilter {
  bool: {
    should?: unknown[];
    filter?: unknown | unknown[];
    minimum_should_match?: number;
  };
}

export interface AlertingAuthorizationFilterOpts {
  type: AlertingAuthorizationFilterType;
  fieldNames: AlertingAuthorizationFilterFieldNames;
}

interface AlertingAuthorizationFilterFieldNames {
  ruleTypeId: string;
  consumer: string;
  spaceIds?: string;
}

export function asFiltersByRuleTypeAndConsumer(
  ruleTypes: Set<RegistryAlertTypeWithAuth>,
  opts: AlertingAuthorizationFilterOpts,
  alertSpaceId?: string
): KueryNode | BooleanFilter {
  if (opts.type === AlertingAuthorizationFilterType.ESDSL) {
    return buildRuleTypeFilter(ruleTypes, opts, alertSpaceId);
  } else {
    return nodeBuilder.or(
      Array.from(ruleTypes).reduce<KueryNode[]>((filters, { id, authorizedConsumers }) => {
        ensureFieldIsSafeForQuery('ruleTypeId', id);
        filters.push(
          nodeBuilder.and([
            nodeBuilder.is(opts.fieldNames.ruleTypeId, id),
            nodeBuilder.or(
              Object.keys(authorizedConsumers).map((consumer) => {
                ensureFieldIsSafeForQuery('consumer', consumer);
                return nodeBuilder.is(opts.fieldNames.consumer, consumer);
              })
            ),
          ])
        );
        return filters;
      }, [])
    );
  }
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

export const buildRuleTypeFilter = (
  ruleTypes: Set<RegistryAlertTypeWithAuth>,
  opts: AlertingAuthorizationFilterOpts,
  alertSpaceId?: string
): BooleanFilter => {
  const allFilters = Array.from(ruleTypes).map(({ id, authorizedConsumers }) => {
    const ruleIdFilter = {
      bool: {
        should: [
          {
            match: {
              [opts.fieldNames.ruleTypeId]: id,
            },
          },
        ],
        minimum_should_match: 1,
      },
    };
    const spaceIdFilter =
      alertSpaceId != null && opts.fieldNames.spaceIds != null
        ? { term: { [opts.fieldNames.spaceIds]: alertSpaceId } }
        : {};
    const consumersFilter = {
      bool: {
        should: Object.keys(authorizedConsumers).map((consumer) => {
          ensureFieldIsSafeForQuery('consumer', consumer);

          if (Object.keys(authorizedConsumers).length === 1) {
            return {
              match: {
                [opts.fieldNames.consumer]: consumer,
              },
            };
          } else {
            return {
              bool: {
                should: [{ match: { [opts.fieldNames.consumer]: consumer } }],
                minimum_should_match: 1,
              },
            };
          }
        }),
        minimum_should_match: 1,
      },
    };

    const newFilter =
      alertSpaceId != null
        ? [{ ...ruleIdFilter }, { ...spaceIdFilter }, { ...consumersFilter }]
        : [{ ...ruleIdFilter }, { ...consumersFilter }];

    return {
      bool: {
        filter: [...newFilter],
      },
    };
  });

  if (ruleTypes.size > 1) {
    return {
      bool: {
        minimum_should_match: 1,
        should: [...allFilters],
      },
    };
  }

  return allFilters[0];
};
