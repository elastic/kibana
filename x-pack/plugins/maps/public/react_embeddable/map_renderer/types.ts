/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HasType, apiIsOfType } from '@kbn/presentation-publishing';
import { RenderToolTipContent } from '../../classes/tooltips/tooltip_property';

export const MAP_RENDERER_TYPE = 'mapRenderer';

export type MapRendererApi = HasType<typeof MAP_RENDERER_TYPE> & {
  getTooltipRenderer?: () => RenderToolTipContent;
  hideFilterActions?: boolean;
  isSharable?: boolean;
};

export function isMapRendererApi(api: unknown): api is MapRendererApi {
  return Boolean(api && apiIsOfType(api, MAP_RENDERER_TYPE));
}
