/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsersQueries } from '../../../common/search_strategy';
import { createIndicesFromPrefix } from './create_indices_from_prefix';
import { GetTransformChanges } from './types';

/**
 * Given a factory query type this will return the transform changes such as the transform indices if it matches
 * the correct type, otherwise it will return "undefined"
 * @param factoryQueryType The query type to check if we have a transform for it and are capable of rendering one or not
 * @param settings The settings configuration to get the prefix from
 * @returns The transform type if we have one, otherwise undefined
 */
export const getTransformChangesForUsers: GetTransformChanges = ({
  factoryQueryType,
  settings,
}) => {
  switch (factoryQueryType) {
    case UsersQueries.authentications: {
      return {
        indices: createIndicesFromPrefix({
          prefix: settings.prefix,
          transformIndices: ['user_ent*'],
        }),
        factoryQueryType: UsersQueries.authenticationsEntities,
      };
    }
    default: {
      return undefined;
    }
  }
};
