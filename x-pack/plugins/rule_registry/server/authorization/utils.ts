/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { remove, uniq } from 'lodash';

import { KibanaRequest } from 'src/core/server';

import { nodeBuilder } from '../../../../../src/plugins/data/common';
import { KueryNode } from '../../../../../src/plugins/data/server';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { GetSpaceFn } from './rac_authorization';

export const getEnabledKibanaSpaceFeatures = async ({
  getSpace,
  request,
  features,
}: {
  request: KibanaRequest;
  getSpace: GetSpaceFn;
  features: FeaturesPluginStart;
}): Promise<Set<string>> => {
  try {
    const disabledUserSpaceFeatures = new Set((await getSpace(request))?.disabledFeatures ?? []);

    // Filter through all user Kibana features to find corresponding enabled
    // RAC feature owners like 'security-solution' or 'observability'
    const owners = await new Set(
      features
        .getKibanaFeatures()
        // get all the rac 'owners' that aren't disabled
        .filter(({ id }) => !disabledUserSpaceFeatures.has(id))
        .flatMap((feature) => {
          return feature.rac ?? [];
        })
    );
    return owners;
  } catch (error) {
    return new Set<string>();
  }
};

export const getOwnersFilter = (owners: string[]): KueryNode => {
  // const kqlQuery: Query = {
  //     language: 'kuery',
  //     query: filter,
  //   };
  //   const config: EsQueryConfig = {
  //     allowLeadingWildcards: true,
  //     dateFormatTZ: 'Zulu',
  //     ignoreFilterIfFieldNotInIndex: false,
  //     queryStringOptions: { analyze_wildcard: true },
  //   };
  //   return esQuery.buildEsQuery(undefined, kqlQuery, [], config);
  //   return nodeBuilder.or(
  //     owners.reduce<KueryNode[]>((query, owner) => {
  //       ensureFieldIsSafeForQuery('owner', owner);
  //       query.push(nodeBuilder.is(`${savedObjectType}.attributes.owner`, owner));
  //       return query;
  //     }, [])
  //   );
};

export const combineFilterWithAuthorizationFilter = (
  filter: KueryNode,
  authorizationFilter: KueryNode
) => {
  return nodeBuilder.and([filter, authorizationFilter]);
};

export const ensureFieldIsSafeForQuery = (field: string, value: string): boolean => {
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
};

export const includeFieldsRequiredForAuthentication = (fields: string[]): string[] =>
  uniq([...fields, 'owner']);
