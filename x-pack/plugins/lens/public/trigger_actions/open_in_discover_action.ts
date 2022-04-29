/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createAction } from '@kbn/ui-actions-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import { Filter } from '@kbn/es-query';
import { TimeRange } from '@kbn/data-plugin/public';
import type { Embeddable } from '../embeddable';
import { DOC_TYPE } from '../../common';

const ACTION_OPEN_IN_DISCOVER = 'ACTION_OPEN_IN_DISCOVER';

interface Context {
  embeddable: Embeddable;
  filters?: Filter[];
  timeRange?: TimeRange;
  openInSameTab?: boolean;
}

export const createOpenInDiscoverAction = (discover: DiscoverStart, hasDiscoverAccess: boolean) =>
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
      if (!hasDiscoverAccess) return false;
      return (
        context.embeddable.type === DOC_TYPE &&
        (await (context.embeddable as Embeddable).canViewUnderlyingData())
      );
    },
    execute: async (context: Context) => {
      const args = context.embeddable.getViewUnderlyingDataArgs()!;
      const discoverUrl = discover.locator?.getRedirectUrl({
        ...args,
        timeRange: context.timeRange || args.timeRange,
        filters: [...(context.filters || []), ...args.filters],
      });
      window.open(discoverUrl, !context.openInSameTab ? '_blank' : '_self');
    },
  });
