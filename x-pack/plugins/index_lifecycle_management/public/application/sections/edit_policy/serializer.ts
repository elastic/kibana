/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SerializedPolicy } from '../../../../common/types';

import { FormInternal } from './types';

export const createSerializer = (originalPolicy?: SerializedPolicy) => (
  data: FormInternal
): SerializedPolicy => {
  const { _meta, ...rest } = data;

  if (!rest.phases || !rest.phases.hot) {
    rest.phases = { hot: { actions: {} } };
  }

  if (rest.phases.hot) {
    rest.phases.hot.min_age = originalPolicy?.phases.hot?.min_age ?? '0ms';
  }

  if (rest.phases.hot?.actions) {
    if (rest.phases.hot.actions?.rollover && _meta.hot.useRollover) {
      if (rest.phases.hot.actions.rollover.max_age) {
        rest.phases.hot.actions.rollover.max_age = `${rest.phases.hot.actions.rollover.max_age}${_meta.hot.maxAgeUnit}`;
      }

      if (rest.phases.hot.actions.rollover.max_size) {
        rest.phases.hot.actions.rollover.max_size = `${rest.phases.hot.actions.rollover.max_size}${_meta.hot.maxStorageSizeUnit}`;
      }

      if (_meta.hot.bestCompression && rest.phases.hot.actions?.forcemerge) {
        rest.phases.hot.actions.forcemerge.index_codec = 'best_compression';
      }
    } else {
      delete rest.phases.hot.actions?.rollover;
    }
  }

  return rest;
};
