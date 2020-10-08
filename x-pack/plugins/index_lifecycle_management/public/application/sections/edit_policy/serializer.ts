/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormInternal } from './components/phases/types';

export const serializer = (data: FormInternal) => {
  const { _meta, ...rest } = data;

  if (!rest.phases) {
    rest.phases = { hot: { actions: {} } };
  }

  if (rest.phases.hot?.actions?.rollover) {
    if (rest.phases.hot.actions.rollover.max_size) {
      rest.phases.hot.actions.rollover.max_size = `${rest.phases.hot.actions.rollover.max_size}${_meta.hot.maxStorageSizeUnit}`;
    }
    if (rest.phases.hot.actions.rollover.max_age) {
      rest.phases.hot.actions.rollover.max_age = `${rest.phases.hot.actions.rollover.max_age}${_meta.hot.maxAgeUnit}`;
    }

    if (_meta.hot.bestCompression && rest.phases.hot.actions?.forcemerge) {
      rest.phases.hot.actions.forcemerge.index_codec = 'best_compression';
    }
  }
  return rest;
};
