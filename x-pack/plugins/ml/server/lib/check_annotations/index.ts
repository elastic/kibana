/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { mlLog } from '../log';

import {
  ML_ANNOTATIONS_INDEX_ALIAS_READ,
  ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
} from '../../../common/constants/index_patterns';

// Annotations Feature is available if:
// - ML_ANNOTATIONS_INDEX_ALIAS_READ alias is present
// - ML_ANNOTATIONS_INDEX_ALIAS_WRITE alias is present
// Note there is no need to check for the existence of the indices themselves as aliases are stored
// in the metadata of the indices they point to, so it's impossible to have an alias that doesn't point to any index.
export async function isAnnotationsFeatureAvailable({ asInternalUser }: IScopedClusterClient) {
  try {
    const annotationsReadAliasExists = await asInternalUser.indices.existsAlias({
      index: ML_ANNOTATIONS_INDEX_ALIAS_READ,
      name: ML_ANNOTATIONS_INDEX_ALIAS_READ,
    });

    if (!annotationsReadAliasExists) {
      return false;
    }

    const annotationsWriteAliasExists = await asInternalUser.indices.existsAlias({
      index: ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
      name: ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
    });
    if (!annotationsWriteAliasExists) {
      return false;
    }
  } catch (err) {
    mlLog.info('Disabling ML annotations feature because the index/alias integrity check failed.');
    return false;
  }

  return true;
}
