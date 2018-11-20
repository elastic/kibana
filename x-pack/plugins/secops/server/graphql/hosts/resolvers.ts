/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldNode, SelectionNode, SelectionSetNode } from 'graphql';
import { isEmpty } from 'lodash/fp';

import { SourceResolvers } from '../../../common/graphql/types';
import { AppResolvedResult, AppResolverOf } from '../../lib/framework';
import { Hosts } from '../../lib/Hosts';
import { HostsRequestOptions } from '../../lib/Hosts/types';
import { Context } from '../../lib/types';
import { parseFilterQuery } from '../../utils/serialized_query';
import { QuerySourceResolver } from '../sources/resolvers';

type QueryHostsResolver = AppResolverOf<
  SourceResolvers.HostsResolver,
  AppResolvedResult<QuerySourceResolver>,
  Context
>;

interface HostsResolversDeps {
  hosts: Hosts;
}

export const createHostsResolvers = (
  libs: HostsResolversDeps
): {
  Source: {
    Hosts: QueryHostsResolver;
  };
} => ({
  Source: {
    async Hosts(source, args, { req }, info) {
      const fields = getFields(info.fieldNodes[0]);
      const options: HostsRequestOptions = {
        sourceConfiguration: source.configuration,
        timerange: args.timerange,
        filterQuery: parseFilterQuery(args.filterQuery || ''),
        fields: fields.map(f => f.replace('Hosts.', '')),
      };
      return libs.Hosts.getHosts(req, options);
    },
  },
});

const getFields = (
  data: SelectionSetNode | FieldNode,
  fields: string[] = [],
  postFields: string[] = []
): string[] => {
  if (data.kind === 'Field' && data.selectionSet && !isEmpty(data.selectionSet.selections)) {
    return getFields(data.selectionSet, fields);
  } else if (data.kind === 'SelectionSet') {
    return data.selections.reduce(
      (res: string[], item: SelectionNode) => {
        if (item.kind === 'Field') {
          const field: FieldNode = item as FieldNode;
          if (field.name.kind === 'Name' && field.name.value.includes('kpi')) {
            return [...res, field.name.value];
          } else if (field.selectionSet && !isEmpty(field.selectionSet.selections)) {
            return getFields(field.selectionSet, res, postFields.concat(field.name.value));
          }
          return [...res, [...postFields, field.name.value].join('.')];
        }
        return res;
      },
      fields as string[]
    );
  }
  return fields;
};
