/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvokeCreator } from 'xstate';
import { InventoryViewsServiceStart } from '../../../../services/inventory_views';
import { InventoryPageContext, InventoryPageEvent } from './types';

interface InventoryPageSavedViewStateDependencies {
  inventoryViewsService: InventoryViewsServiceStart;
}
const defaultViewId = '0';

export const initializeFromSavedViewService =
  ({
    inventoryViewsService,
  }: InventoryPageSavedViewStateDependencies): InvokeCreator<
    InventoryPageContext,
    InventoryPageEvent
  > =>
  (context, _event) =>
  (send) => {
    inventoryViewsService.client
      .getInventoryView(context.savedViewId ?? defaultViewId)
      .then((savedView) => {
        const {
          sort,
          metric,
          groupBy,
          nodeType,
          view,
          customOptions,
          customMetrics,
          boundsOverride,
          autoBounds,
          accountId,
          region,
          legend,
          timelineOpen,
        } = savedView.attributes;

        const viewState = {
          filter: savedView.attributes.filterQuery,
          options: {
            sort,
            metric,
            groupBy,
            nodeType,
            view,
            customOptions,
            customMetrics,
            boundsOverride,
            autoBounds,
            accountId,
            region,
            legend,
            timelineOpen,
          },
          time: {
            currentTime: savedView.attributes.time ?? Date.now(),
            isAutoReloading: savedView.attributes.autoReload,
          },
          savedViewName: savedView.attributes.name as string,
        };

        send({
          type: 'INITIALIZED_FROM_SAVED_VIEW_SERVICE',
          ...viewState,
        });
      });
  };
