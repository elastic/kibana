/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { GetInvestigationResponse, InvestigationItem } from '@kbn/investigation-shared';
import React, { useEffect, useState } from 'react';
import { useKibana } from '../../../hooks/use_kibana';

export type RenderedInvestigationItem = InvestigationItem & {
  loading: boolean;
  element: React.ReactNode;
};

export function useRenderItems({
  items,
  params,
}: {
  items?: InvestigationItem[];
  params: GetInvestigationResponse['params'];
}) {
  const {
    dependencies: {
      start: { investigate },
    },
  } = useKibana();

  const [renderableItems, setRenderableItems] = useState<RenderedInvestigationItem[]>([]);

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

          const globalParams = {
            timeRange: {
              from: new Date(params.timeRange.from).toISOString(),
              to: new Date(params.timeRange.to).toISOString(),
            },
          };

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
  }, [items, investigate, params]);

  return renderableItems;
}
