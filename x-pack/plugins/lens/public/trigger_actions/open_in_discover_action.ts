/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { DataViewsService } from '@kbn/data-views-plugin/public';
import type { DiscoverAppLocator } from './open_in_discover_helpers';

const ACTION_OPEN_IN_DISCOVER = 'ACTION_OPEN_IN_DISCOVER';

export const getDiscoverHelpersAsync = async () => await import('../async_services');

export const createOpenInDiscoverAction = (
  locator: DiscoverAppLocator,
  dataViews: Pick<DataViewsService, 'get'>,
  hasDiscoverAccess: boolean
) =>
  createAction<EmbeddableApiContext>({
    type: ACTION_OPEN_IN_DISCOVER,
    id: ACTION_OPEN_IN_DISCOVER,
    order: 19, // right after Inspect which is 20
    getIconType: () => 'popout',
    getDisplayName: () =>
      i18n.translate('xpack.lens.action.exploreInDiscover', {
        defaultMessage: 'Explore in Discover',
      }),
    getHref: async (context: EmbeddableApiContext) => {
      const { getHref } = await getDiscoverHelpersAsync();
      return getHref({
        locator,
        dataViews,
        hasDiscoverAccess,
        ...context,
      });
    },
    isCompatible: async (context: EmbeddableApiContext) => {
      const { isCompatible } = await getDiscoverHelpersAsync();
      return isCompatible({
        hasDiscoverAccess,
        locator,
        dataViews,
        embeddable: context.embeddable,
      });
    },
    execute: async (context: EmbeddableApiContext) => {
      const { execute } = await getDiscoverHelpersAsync();
      return execute({ ...context, locator, dataViews, hasDiscoverAccess });
    },
  });
