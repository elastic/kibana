/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { mlLog } from '../../lib/log';

import {
  ML_ANNOTATIONS_INDEX_ALIAS_READ,
  ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
  ML_ANNOTATIONS_INDEX_PATTERN,
} from '../../../common/constants/index_patterns';

// Annotations Feature is available if:
// - ML_ANNOTATIONS_INDEX_PATTERN index is present
// - ML_ANNOTATIONS_INDEX_ALIAS_READ alias is present
// - ML_ANNOTATIONS_INDEX_ALIAS_WRITE alias is present
export async function isAnnotationsFeatureAvailable({ asInternalUser }: IScopedClusterClient) {
  try {
    const indexParams = { index: ML_ANNOTATIONS_INDEX_PATTERN };

    const { body: annotationsIndexExists } = await asInternalUser.indices.exists(indexParams);
    if (!annotationsIndexExists) {
      return false;
    }

    const { body: annotationsReadAliasExists } = await asInternalUser.indices.existsAlias({
      index: ML_ANNOTATIONS_INDEX_ALIAS_READ,
      name: ML_ANNOTATIONS_INDEX_ALIAS_READ,
    });

    if (!annotationsReadAliasExists) {
      return false;
    }

    const { body: annotationsWriteAliasExists } = await asInternalUser.indices.existsAlias({
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
