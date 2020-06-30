/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';
import { mlLog } from '../../client/log';

import {
  ML_ANNOTATIONS_INDEX_ALIAS_READ,
  ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
  ML_ANNOTATIONS_INDEX_PATTERN,
} from '../../../common/constants/index_patterns';

// Annotations Feature is available if:
// - ML_ANNOTATIONS_INDEX_PATTERN index is present
// - ML_ANNOTATIONS_INDEX_ALIAS_READ alias is present
// - ML_ANNOTATIONS_INDEX_ALIAS_WRITE alias is present
export async function isAnnotationsFeatureAvailable(callAsCurrentUser: LegacyAPICaller) {
  try {
    const indexParams = { index: ML_ANNOTATIONS_INDEX_PATTERN };

    const annotationsIndexExists = await callAsCurrentUser('indices.exists', indexParams);
    if (!annotationsIndexExists) {
      return false;
    }

    const annotationsReadAliasExists = await callAsCurrentUser('indices.existsAlias', {
      index: ML_ANNOTATIONS_INDEX_ALIAS_READ,
      name: ML_ANNOTATIONS_INDEX_ALIAS_READ,
    });

    if (!annotationsReadAliasExists) {
      return false;
    }

    const annotationsWriteAliasExists = await callAsCurrentUser('indices.existsAlias', {
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
