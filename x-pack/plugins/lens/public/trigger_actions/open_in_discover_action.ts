/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { createAction } from '@kbn/ui-actions-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { Embeddable } from '../embeddable';
import { DOC_TYPE } from '../../common';

const ACTION_OPEN_IN_DISCOVER = 'ACTION_OPEN_IN_DISCOVER';

export const createOpenInDiscoverAction = (discover: DiscoverStart, hasDiscoverAccess: boolean) =>
  createAction<{ embeddable: IEmbeddable }>({
    type: ACTION_OPEN_IN_DISCOVER,
    id: ACTION_OPEN_IN_DISCOVER,
    order: 19, // right after Inspect which is 20
    getIconType: () => 'popout',
    getDisplayName: () =>
      i18n.translate('xpack.lens.app.exploreDataInDiscover', {
        defaultMessage: 'Explore data in Discover',
      }),
    isCompatible: async (context: { embeddable: IEmbeddable }) => {
      if (!hasDiscoverAccess) return false;
      return (
        context.embeddable.type === DOC_TYPE &&
        (await (context.embeddable as Embeddable).canViewUnderlyingData())
      );
    },
    execute: async (context: { embeddable: Embeddable }) => {
      const args = context.embeddable.getViewUnderlyingDataArgs()!;
      const discoverUrl = discover.locator?.getRedirectUrl({
        ...args,
      });
      window.open(discoverUrl, '_blank');
    },
  });
