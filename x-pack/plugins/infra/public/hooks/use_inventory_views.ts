/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUiTracker } from '@kbn/observability-plugin/public';

import { useKibanaContextForPlugin } from './use_kibana';
import { useUrlState } from '../utils/use_url_state';
import { useSavedViewsNotifier } from './use_saved_views_notifier';
import { useSourceContext } from '../containers/metrics_source';

const queryKeys = {
  find: ['inventory-views-find'] as const,
  get: (id?: string) => ['inventory-views-get', id].filter(Boolean),
};

export const useInventoryViews = () => {
  const { inventoryViews } = useKibanaContextForPlugin().services;
  const trackMetric = useUiTracker({ app: 'infra_metrics' });

  const queryClient = useQueryClient();
  const { source, updateSourceConfiguration } = useSourceContext();

  const defaultViewId = source?.configuration.inventoryDefaultView ?? '0';

  const [currentViewId, switchViewById] = useUrlState<InventoryViewId>({
    defaultState: defaultViewId,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'inventoryViewId',
    writeDefaultState: true,
  });

  const notify = useSavedViewsNotifier();

  const {
    data: views,
    refetch: fetchViews,
    isFetching: isFetchingViews,
  } = useQuery({
    queryKey: queryKeys.find,
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
    queryKey: queryKeys.get(currentViewId),
    queryFn: ({ queryKey: [, id] }) => inventoryViews.getInventoryView(id),
    onError: (error) => notify.getViewFailure(error.response.message),
    placeholderData: null,
  });

  const { mutate: setDefaultViewById } = useMutation({
    mutationFn: (id: string) => updateSourceConfiguration({ inventoryDefaultView: id }),
    /**
     * To provide a quick feedback, we perform an optimistic update on the list
     * when updating the default view.
     * 1. Cancel any outgoing refetches (so they don't overwrite our optimistic update)
     * 2. Snapshot the previous views list
     * 3. Optimistically update the list with new default view and store in cache
     * 4. Return a context object with the snapshotted views
     */
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.find }); // 1
      const previousViews = queryClient.getQueryData(queryKeys.find); // 2
      const updatedViews = getListWithUpdatedDefault(id, previousViews); // 3
      queryClient.setQueryData(queryKeys.find, updatedViews);
      return { previousViews }; // 4
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (error, _id, context) => {
      notify.setDefaultViewFailure(error.response.message);
      queryClient.setQueryData(queryKeys.find, context.previousViews);
    },
    // Always refetch after error or success:
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.get() }); // Invalidate all single views cache entries
    },
    onSettled: () => {
      fetchViews(); // Always invalidate views list cache and refetch views on success/error
    },
  });

  const { mutate: createView, isLoading: isCreatingView } = useMutation({
    mutationFn: (attributes /* TODO: add type */) => inventoryViews.createInventoryView(attributes),
    onError: (error) => {
      notify.upsertViewFailure(error.response.message);
    },
    onSuccess: (createdView) => {
      queryClient.setQueryData(queryKeys.get(createdView.id), createdView); // Store in cache created view
      switchViewById(createdView.id); // Update current view and url state
      fetchViews(); // Invalidate views list cache and refetch views
    },
  });

  const { mutate: updateViewById, isLoading: isUpdatingView } = useMutation({
    mutationFn: ({ id, attributes } /* TODO: add type */) =>
      inventoryViews.updateInventoryView(id, attributes),
    onError: (error) => {
      notify.upsertViewFailure(error.response.message);
    },
    onSuccess: (updatedView) => {
      queryClient.setQueryData(queryKeys.get(updatedView.id), updatedView); // Store in cache updated view
      fetchViews(); // Invalidate views list cache and refetch views
    },
  });

  const { mutate: deleteViewById } = useMutation({
    mutationFn: (id: string) => inventoryViews.deleteInventoryView(id),
    /**
     * To provide a quick feedback, we perform an optimistic update on the list
     * when deleting a view.
     * 1. Cancel any outgoing refetches (so they don't overwrite our optimistic update)
     * 2. Snapshot the previous views list
     * 3. Optimistically update the list removing the view and store in cache
     * 4. Return a context object with the snapshotted views
     */
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.find }); // 1

      const previousViews = queryClient.getQueryData(queryKeys.find); // 2

      const updatedViews = getListWithoutDeletedView(id, previousViews); // 3
      queryClient.setQueryData(queryKeys.find, updatedViews);

      return { previousViews }; // 4
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (error, _id, context) => {
      queryClient.setQueryData(queryKeys.find, context.previousViews);
    },
    onSuccess: (_data, id) => {
      // If the deleted view was the current one, switch to the default view
      if (currentView.id === id) {
        switchViewById(defaultViewId);
      }
    },
    onSettled: () => {
      fetchViews(); // Invalidate views list cache and refetch views
    },
  });

  return {
    // Values about views list
    views,
    currentView,
    // Actions about updating view
    createView,
    deleteViewById,
    fetchViews,
    updateViewById,
    switchViewById,
    setDefaultViewById,
    // Status flags
    isCreatingView,
    isFetchingCurrentView,
    isFetchingViews,
    isUpdatingView,
  };
};

const inventoryViewIdRT = rt.string;
type InventoryViewId = rt.TypeOf<typeof inventoryViewIdRT>;

const encodeUrlState = inventoryViewIdRT.encode;
const decodeUrlState = (value: unknown) => {
  const state = pipe(inventoryViewIdRT.decode(value), fold(constant('0'), identity));
  return state;
};

/**
 * Helpers
 */
const getListWithUpdatedDefault = (id: string, views) => {
  return views.map((view) => ({
    ...view,
    attributes: {
      ...view.attributes,
      isDefault: view.id === id,
    },
  }));
};

const getListWithoutDeletedView = (id: string, views) => {
  return views.filter((view) => view.id !== id);
};
