/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Filter } from 'src/plugins/data/public';

import { RenderToolTipContent } from '../../layers/tooltips/tooltip_property';

export const GisMap: React.ComponentType<{
  addFilters: ((filters: Filter[]) => void) | null;
  renderTooltipContent?: RenderToolTipContent;
}>;
