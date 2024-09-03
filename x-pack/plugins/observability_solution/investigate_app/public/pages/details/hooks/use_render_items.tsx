/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { type GlobalWidgetParameters } from '@kbn/investigate-plugin/public';
import { GetInvestigationResponse, InvestigationItem, Item } from '@kbn/investigation-shared';
import React, { useEffect, useState } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { useFetchInvestigationItems } from '../../../hooks/use_fetch_investigation_items';
import { useAddInvestigationItem } from '../../../hooks/use_add_investigation_item';
import { useDeleteInvestigationItem } from '../../../hooks/use_delete_investigation_item';
import { useUpdateInvestigation } from '../../../hooks/use_update_investigation';

export type RenderedInvestigationItem = InvestigationItem & {
  loading: boolean;
  element: React.ReactNode;
};

interface Props {
  investigation: GetInvestigationResponse;
}

interface UseRenderItemsHook {
  renderableItems: RenderedInvestigationItem[];
  globalParams: GlobalWidgetParameters;
  updateInvestigationParams: (params: GlobalWidgetParameters) => Promise<void>;
  addItem: (item: Item) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  isAdding: boolean;
  isDeleting: boolean;
}

export function useRenderItems({ investigation }: Props): UseRenderItemsHook {
  const {
    dependencies: {
      start: { investigate },
    },
  } = useKibana();

  const { data: items, refetch } = useFetchInvestigationItems({
    investigationId: investigation.id,
    initialItems: investigation.items,
  });

  const { mutateAsync: updateInvestigation } = useUpdateInvestigation();
  const { mutateAsync: addInvestigationItem, isLoading: isAdding } = useAddInvestigationItem();
  const { mutateAsync: deleteInvestigationItem, isLoading: isDeleting } =
    useDeleteInvestigationItem();

  const [renderableItems, setRenderableItems] = useState<RenderedInvestigationItem[]>([]);
  const [globalParams, setGlobalParams] = useState<GlobalWidgetParameters>({
    timeRange: {
      from: new Date(investigation.params.timeRange.from).toISOString(),
      to: new Date(investigation.params.timeRange.to).toISOString(),
    },
  });

  const updateInvestigationParams = async (nextGlobalParams: GlobalWidgetParameters) => {
    const timeRange = {
      from: new Date(nextGlobalParams.timeRange.from).getTime(),
      to: new Date(nextGlobalParams.timeRange.to).getTime(),
    };

    await updateInvestigation({
      investigationId: investigation.id,
      payload: { params: { timeRange } },
    });
    setGlobalParams(nextGlobalParams);
  };

  const addItem = async (item: Item) => {
    await addInvestigationItem({ investigationId: investigation.id, item });
    refetch();
  };

  const deleteItem = async (itemId: string) => {
    await deleteInvestigationItem({ investigationId: investigation.id, itemId });
    refetch();
  };

  useEffect(() => {
    async function renderItems(currItems: InvestigationItem[]) {
      return await Promise.all(
        currItems.map(async (item) => {
          const itemDefinition = investigate.getItemDefinitionByType(item.type);
          if (!itemDefinition) {
            return Promise.resolve({
              ...item,
              loading: false,
              element: (
                <div>
                  {i18n.translate('xpack.investigateApp.renderableItems.div.notFoundLabel', {
                    defaultMessage: 'Not found for type {type}',
                    values: { type: item.type },
                  })}
                </div>
              ),
            });
          }

          const data = await itemDefinition.generate({
            itemParams: item.params,
            globalParams,
          });

          return Promise.resolve({
            ...item,
            loading: false,
            element: itemDefinition.render({
              data,
              globalParams,
              itemParams: item.params,
            }),
          });
        })
      );
    }

    if (items) {
      renderItems(items).then((nextRenderableItems) => setRenderableItems(nextRenderableItems));
    }
  }, [items, investigate, globalParams]);

  return {
    renderableItems,
    updateInvestigationParams,
    globalParams,
    addItem,
    deleteItem,
    isAdding,
    isDeleting,
  };
}
