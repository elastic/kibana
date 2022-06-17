/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createAction } from '@kbn/ui-actions-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { DataViewsService } from '@kbn/data-views-plugin/public';
import { execute, isCompatible } from './open_in_discover_helpers';

const ACTION_OPEN_IN_DISCOVER = 'ACTION_OPEN_IN_DISCOVER';

interface Context {
  embeddable: IEmbeddable;
}

export const createOpenInDiscoverAction = (
  discover: Pick<DiscoverStart, 'locator'>,
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
    isCompatible: async (context: Context) => {
      return isCompatible({
        hasDiscoverAccess,
        discover,
        dataViews,
        embeddable: context.embeddable,
      });
    },
    execute: async (context: Context) => {
      return execute({ ...context, discover, dataViews, hasDiscoverAccess });
    },
  });
