/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX } from '../../../common/constants';
import { stripSearchPrefix } from '../../../common/utils/strip_search_prefix';

import { isIndexNotFoundException } from '../../utils/identify_exceptions';

export const deleteAccessControlIndex = async (client: IScopedClusterClient, index: string) => {
  try {
    return await client.asCurrentUser.indices.delete({
      index: stripSearchPrefix(index, CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX),
    });
  } catch (e) {
    // Gracefully exit if index not found. This is a valid case.
    if (!isIndexNotFoundException(e)) throw e;
  }
};
