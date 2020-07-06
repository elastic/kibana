/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Filter } from 'src/plugins/data/public';

import { RenderToolTipContent } from '../../classes/tooltips/tooltip_property';

declare const GisMap: React.ComponentType<{
  addFilters: ((filters: Filter[]) => void) | null;
  renderTooltipContent?: RenderToolTipContent;
}>;

export { GisMap };
// eslint-disable-next-line import/no-default-export
export default GisMap;
