/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEmbeddable } from 'src/plugins/embeddable/public';
import { createAction } from '../../../../../src/plugins/ui_actions/public';
import type { Embeddable } from '../embeddable';
import type { DiscoverStart } from '../../../../../src/plugins/discover/public';
import { DOC_TYPE, getShowUnderlyingDataLabel } from '../../common';

const ACTION_OPEN_IN_DISCOVER = 'ACTION_OPEN_IN_DISCOVER';

export const createOpenInDiscoverAction = (discover: DiscoverStart, hasDiscoverAccess: boolean) =>
  createAction<{ embeddable: IEmbeddable }>({
    type: ACTION_OPEN_IN_DISCOVER,
    id: ACTION_OPEN_IN_DISCOVER,
    order: 19, // right after Inspect which is 20
    getIconType: () => 'popout',
    getDisplayName: () => getShowUnderlyingDataLabel(),
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
