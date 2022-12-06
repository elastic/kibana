/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createAction } from '@kbn/ui-actions-plugin/public';
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import type { DataViewsService } from '@kbn/data-views-plugin/public';
import type { DiscoverAppLocator } from './open_in_discover_helpers';

const ACTION_OPEN_IN_DISCOVER = 'ACTION_OPEN_IN_DISCOVER';

interface Context {
  embeddable: IEmbeddable;
}

export const getDiscoverHelpersAsync = async () => await import('../async_services');

export const createOpenInDiscoverAction = (
  locator: DiscoverAppLocator,
  dataViews: Pick<DataViewsService, 'get'>,
  hasDiscoverAccess: boolean
) =>
  createAction<Context>({
    type: ACTION_OPEN_IN_DISCOVER,
    id: ACTION_OPEN_IN_DISCOVER,
    order: 19, // right after Inspect which is 20
    getIconType: () => 'popout',
    getDisplayName: () =>
      i18n.translate('xpack.lens.app.exploreDataInDiscover', {
        defaultMessage: 'Explore data in Discover',
      }),
    getHref: async (context: Context) => {
      const { getHref } = await getDiscoverHelpersAsync();
      return getHref({
        locator,
        dataViews,
        hasDiscoverAccess,
        ...context,
      });
    },
    isCompatible: async (context: Context) => {
      const { isCompatible } = await getDiscoverHelpersAsync();
      return isCompatible({
        hasDiscoverAccess,
        locator,
        dataViews,
        embeddable: context.embeddable,
      });
    },
    execute: async (context: Context) => {
      const { execute } = await getDiscoverHelpersAsync();
      return execute({ ...context, locator, dataViews, hasDiscoverAccess });
    },
  });
