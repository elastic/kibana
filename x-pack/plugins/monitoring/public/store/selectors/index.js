/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './clusters';
export * from './date';
export * from './breadcrumbs';

import { getDateForUrlComparison } from './date';
import { getActiveClusterUuid } from './clusters';

export const getLocalState = state => {
  const date = getDateForUrlComparison(state);
  const activeClusterUuid = getActiveClusterUuid(state);
  return {
    ...date,
    cluster_uuid: activeClusterUuid
  };
};
