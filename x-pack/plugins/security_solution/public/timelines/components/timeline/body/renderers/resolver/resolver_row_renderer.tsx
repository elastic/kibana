/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RowRenderer } from '../row_renderer';
import { canBeUsedToQueryResolverAPIs } from './ecs';

export const resolverRowRenderer: RowRenderer = {
  isInstance(ecs) {
    return canBeUsedToQueryResolverAPIs(ecs);
  },
  renderRow({ browserFields, data, timelineId }) {
    return <span>its resolver time</span>;
  },
};
