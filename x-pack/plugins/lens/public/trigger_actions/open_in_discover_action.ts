/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { IEmbeddable } from 'src/plugins/embeddable/public';
import { createAction } from '../../../../../src/plugins/ui_actions/public';
import type { Embeddable } from '../embeddable';
import type { DiscoverStart } from '../../../../../src/plugins/discover/public';
import { DOC_TYPE } from '../../common';

const ACTION_OPEN_IN_DISCOVER = 'ACTION_OPEN_IN_DISCOVER';

export const createOpenInDiscoverAction = (discover: DiscoverStart) =>
  createAction<{ embeddable: IEmbeddable }>({
    type: ACTION_OPEN_IN_DISCOVER,
    id: ACTION_OPEN_IN_DISCOVER,
    order: 4,
    getIconType: () => 'popout',
    getDisplayName: () =>
      i18n.translate('xpack.lens.actions.openInDiscover', {
        defaultMessage: 'Open in Discover',
      }),
    isCompatible: async (context: { embeddable: IEmbeddable }) => {
      let isCompatible = false;
      if (context.embeddable.type === DOC_TYPE) {
        isCompatible = await (context.embeddable as Embeddable).getCanViewUnderlyingData();
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
