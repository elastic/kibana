/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { IEmbeddable } from 'src/plugins/embeddable/public';
import { createAction } from '../../../../../src/plugins/ui_actions/public';
import { Embeddable } from '../embeddable';
import type { DiscoverStart } from '../../../../../src/plugins/discover/public';

const ACTION_VIEW_UNDERLYING_DATA = 'ACTION_VIEW_UNDERLYING_DATA';

export const viewUnderlyingDataAction = (discover: DiscoverStart) =>
  createAction<{ embeddable: IEmbeddable }>({
    type: ACTION_VIEW_UNDERLYING_DATA,
    id: ACTION_VIEW_UNDERLYING_DATA,
    getDisplayName: () => 'Open in Discover',
    isCompatible: async (context: { embeddable: IEmbeddable }) => {
      let isCompatible = false;
      if (context.embeddable instanceof Embeddable) {
        isCompatible = await context.embeddable.getCanViewUnderlyingData();
      }
      return isCompatible;
    },
    execute: async (context: { embeddable: Embeddable }) => {
      const args = context.embeddable.getViewUnderlyingDataArgs()!;
      discover.locator?.navigate({
        ...args,
      });
    },
  });
