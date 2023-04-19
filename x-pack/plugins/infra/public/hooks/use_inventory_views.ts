/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';

import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';

import { useUiTracker } from '@kbn/observability-plugin/public';
import { useKibanaContextForPlugin } from './use_kibana';
import { useUrlState } from '../utils/use_url_state';

const queryBuilder = {
  find: ['inventory-views-find'] as const,
  get: (id?: string) => ['inventory-views-get', id].filter(Boolean),
};

const placeholderView = {
  id: null,
  attributes: {},
};

export const useInventoryViews = () => {
  const { inventoryViews } = useKibanaContextForPlugin().services;
  const trackMetric = useUiTracker({ app: 'infra_metrics' }); // TODO: move this tracking to backend

  const [currentViewId, switchViewById] = useUrlState<InventoryViewId>({
    defaultState: '0',
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'inventoryViewId',
    writeDefaultState: true,
  });

  const notify = useInventoryViewsNotifier();

  const {
    data: views,
    refetch: fetchViews,
    isFetching: isFetchingViews,
  } = useQuery({
    queryKey: queryBuilder.find,
    queryFn: () => inventoryViews.findInventoryViews(),
    enabled: false, // We will manually fetch the list when necessary
    placeholderData: [], // Use a default empty array instead of undefined
    onError: (error) => notify.getViewFailure(error.response.message),
    onSuccess: (data) => {
      const prefix = data.length >= 1000 ? 'over' : 'under';
      trackMetric({ metric: `${prefix}_1000_saved_objects_for_inventory_view` });
    },
  });

  const { data: currentView, isFetching: isFetchingCurrentView } = useQuery({
    queryKey: queryBuilder.get(currentViewId),
    queryFn: ({ queryKey: [, id] }) => inventoryViews.getInventoryView(id),
    onError: (error) => notify.getViewFailure(error.response.message),
    placeholderData: placeholderView,
  });

  return {
    // Values about views list
    views,
    fetchViews,
    isFetchingViews,
    // Values about current view
    currentView,
    isFetchingCurrentView,
    // Actions about updating view
    switchViewById,
  };
};

/**
 * Support hooks
 */
const useInventoryViewsNotifier = () => {
  const { notifications } = useKibanaContextForPlugin();

  const getViewFailure = (message?: string) => {
    notifications.toasts.danger({
      toastLifeTimeMs: 3000,
      title:
        message ||
        i18n.translate('xpack.infra.savedView.findError.title', {
          defaultMessage: `An error occurred while loading views.`,
        }),
    });
  };

  const upsertViewFailure = (message?: string) => {
    notifications.toasts.danger({
      toastLifeTimeMs: 3000,
      title:
        message ||
        i18n.translate('xpack.infra.savedView.errorOnCreate.title', {
          defaultMessage: `An error occured saving view.`,
        }),
    });
  };

  return {
    getViewFailure,
    upsertViewFailure,
  };
};

const inventoryViewIdRT = rt.string;

type InventoryViewId = rt.TypeOf<typeof inventoryViewIdRT>;

const encodeUrlState = inventoryViewIdRT.encode;
const decodeUrlState = (value: unknown) => {
  const state = pipe(inventoryViewIdRT.decode(value), fold(constant('0'), identity));
  return state;
};
