/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { getLicense } from 'x-pack/plugins/apm/public/store/reactReduxRequest/license';

export const selectIsMLAvailable = createSelector(
  [getLicense],
  license =>
    license.data &&
    license.data.features &&
    license.data.features.ml &&
    license.data.features.ml.is_available
);
