/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraField, QueryResolvers } from '../../../common/graphql/types';
import { InfraBackendLibs, InfraContext } from '../../lib/infra_types';

export const createFieldResolvers = (libs: InfraBackendLibs) => {
  const getFields: QueryResolvers.FieldsResolver = async (
    parent,
    args,
    { req }: InfraContext
  ): Promise<InfraField[]> => {
    return await libs.fields.getFields(req, args.indexPattern!);
  };

  return {
    Query: {
      fields: getFields,
    },
  };
};
