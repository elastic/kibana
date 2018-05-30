/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';
import { InfraField } from '../../common/types';
import {
  InfraBackendLibs,
  InfraContext,
  InfraResolverFn,
} from '../lib/infra_types';

export const fieldsSchema: any = gql`
  interface InfraField {
    name: String
    type: String
    searchable: Boolean
    aggregatable: Boolean
  }

  extend type Query {
    fields(
      indexPattern: InfraIndexPattern = {
        pattern: "metricbeat_read_only"
        timeFieldName: "@timestamp"
      }
    ): [InfraField]
  }
`;

export const createFieldResolvers = (libs: InfraBackendLibs) => {
  const getFields: InfraResolverFn<InfraField[]> = async (
    src,
    args: any,
    ctx: InfraContext
  ): Promise<InfraField[]> => {
    const { req } = ctx;
    const fields: any = await libs.fields.getFields(req, args.indexPattern);
    return fields;
  };

  return {
    Query: {
      fields: getFields,
    },
  };
};
