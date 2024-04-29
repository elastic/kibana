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
import { useUiTracker } from '@kbn/observability-shared-plugin/public';

import {
  MutationContext,
  SavedViewResult,
  ServerError,
  UpdateViewParams,
} from '../../common/saved_views';
import { MetricsSourceConfigurationResponse } from '../../common/metrics_sources';
import {
  CreateInventoryViewAttributesRequestPayload,
  UpdateInventoryViewAttributesRequestPayload,
} from '../../common/http_api/latest';
import type { InventoryView } from '../../common/inventory_views';
import { useKibanaContextForPlugin } from './use_kibana';
import { useUrlState } from '../utils/use_url_state';
import { useSavedViewsNotifier } from './use_saved_views_notifier';
import { useSourceContext } from '../containers/metrics_source';

export type UseInventoryViewsResult = SavedViewResult<
  InventoryView,
  InventoryViewId,
  CreateInventoryViewAttributesRequestPayload,
  MetricsSourceConfigurationResponse
>;

const queryKeys = {
  find: ['inventory-views-find'] as const,
  get: ['inventory-views-get'] as const,
  getById: (id: string) => ['inventory-views-get', id] as const,
};

export const useInventoryViews = (): UseInventoryViewsResult => {
  const { inventoryViews } = useKibanaContextForPlugin().services;
  const trackMetric = useUiTracker({ app: 'infra_metrics' });

  const queryClient = useQueryClient();
  const { source, persistSourceConfiguration } = useSourceContext();

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
    queryFn: () => inventoryViews.client.findInventoryViews(),
    enabled: false, // We will manually fetch the list when necessary
    placeholderData: [], // Use a default empty array instead of undefined
    onError: (error: ServerError) => notify.getViewFailure(error.body?.message ?? error.message),
    onSuccess: (data) => {
      const prefix = data.length >= 1000 ? 'over' : 'under';
      trackMetric({ metric: `${prefix}_1000_saved_objects_for_inventory_view` });
    },
  });

  const { data: currentView, isFetching: isFetchingCurrentView } = useQuery({
    queryKey: queryKeys.getById(currentViewId),
    queryFn: ({ queryKey: [, id] }) => inventoryViews.client.getInventoryView(id),
    onError: (error: ServerError) => {
      notify.getViewFailure(error.body?.message ?? error.message);
      switchViewById(defaultViewId);
    },
    placeholderData: null,
  });

  const { mutate: setDefaultViewById } = useMutation<
    MetricsSourceConfigurationResponse,
    ServerError,
    string,
    MutationContext<InventoryView>
  >({
    mutationFn: (id) => persistSourceConfiguration({ inventoryDefaultView: id }),
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
      const previousViews = queryClient.getQueryData<InventoryView[]>(queryKeys.find); // 2
      const updatedViews = getListWithUpdatedDefault(id, previousViews); // 3
      queryClient.setQueryData(queryKeys.find, updatedViews);
      return { previousViews }; // 4
    },
    // If the mutation fails but doesn't retrigger the error, use the context returned from onMutate to roll back
    onSuccess: (data, _id, context) => {
      if (!data && context?.previousViews) {
        return queryClient.setQueryData(queryKeys.find, context.previousViews);
      }
      return queryClient.invalidateQueries({ queryKey: queryKeys.get });
    },
  });

  const { mutateAsync: createView, isLoading: isCreatingView } = useMutation<
    InventoryView,
    ServerError,
    CreateInventoryViewAttributesRequestPayload
  >({
    mutationFn: (attributes) => inventoryViews.client.createInventoryView(attributes),
    onError: (error) => {
      notify.upsertViewFailure(error.body?.message ?? error.message);
    },
    onSuccess: (createdView) => {
      queryClient.setQueryData(queryKeys.getById(createdView.id), createdView); // Store in cache created view
      switchViewById(createdView.id); // Update current view and url state
    },
  });

  const { mutateAsync: updateViewById, isLoading: isUpdatingView } = useMutation<
    InventoryView,
    ServerError,
    UpdateViewParams<UpdateInventoryViewAttributesRequestPayload>
  >({
    mutationFn: ({ id, attributes }) => inventoryViews.client.updateInventoryView(id, attributes),
    onError: (error) => {
      notify.upsertViewFailure(error.body?.message ?? error.message);
    },
    onSuccess: (updatedView) => {
      queryClient.setQueryData(queryKeys.getById(updatedView.id), updatedView); // Store in cache updated view
    },
  });

  const { mutate: deleteViewById } = useMutation<
    null,
    ServerError,
    string,
    MutationContext<InventoryView>
  >({
    mutationFn: (id: string) => inventoryViews.client.deleteInventoryView(id),
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

      const previousViews = queryClient.getQueryData<InventoryView[]>(queryKeys.find); // 2

      const updatedViews = getListWithoutDeletedView(id, previousViews); // 3
      queryClient.setQueryData(queryKeys.find, updatedViews);

      return { previousViews }; // 4
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (error, _id, context) => {
      notify.deleteViewFailure(error.body?.message ?? error.message);
      if (context?.previousViews) {
        queryClient.setQueryData(queryKeys.find, context.previousViews);
      }
    },
    onSuccess: (_data, id) => {
      // If the deleted view was the current one, switch to the default view
      if (currentView?.id === id) {
        switchViewById(defaultViewId);
      }
    },
    onSettled: () => {
      fetchViews(); // Invalidate views list cache and refetch views
    },
  });

  return {
    // Values
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
  const state = pipe(inventoryViewIdRT.decode(value), fold(constant(undefined), identity));
  return state;
};

/**
 * Helpers
 */
const getListWithUpdatedDefault = (id: string, views: InventoryView[] = []) => {
  return views.map((view) => ({
    ...view,
    attributes: {
      ...view.attributes,
      isDefault: view.id === id,
    },
  }));
};

const getListWithoutDeletedView = (id: string, views: InventoryView[] = []) => {
  return views.filter((view) => view.id !== id);
};
