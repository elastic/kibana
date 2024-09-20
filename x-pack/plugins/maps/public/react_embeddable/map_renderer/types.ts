/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HasType, PublishesUnifiedSearch, apiIsOfType } from '@kbn/presentation-publishing';
import { HasSerializedChildState } from '@kbn/presentation-containers';
import { RenderToolTipContent } from '../../classes/tooltips/tooltip_property';
import { MapSerializedState } from '../types';

export const MAP_RENDERER_TYPE = 'mapRenderer';

export type MapRendererApi = HasType<typeof MAP_RENDERER_TYPE> &
  HasSerializedChildState<MapSerializedState> &
  PublishesUnifiedSearch & {
    getTooltipRenderer?: () => RenderToolTipContent;
    hideFilterActions: boolean;
  };

export function isMapRendererApi(api: unknown): api is MapRendererApi {
  return Boolean(
    api &&
      apiIsOfType(api, MAP_RENDERER_TYPE) &&
      (api as MapRendererApi).hideFilterActions !== undefined
  );
}
