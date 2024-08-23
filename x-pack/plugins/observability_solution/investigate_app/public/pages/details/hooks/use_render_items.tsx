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

export function useRenderItems({ investigation }: { investigation?: GetInvestigationResponse }) {
  const {
    dependencies: {
      start: { investigate },
    },
  } = useKibana();

  const [renderableItems, setRenderableItems] = useState<
    Array<InvestigationItem & { loading: boolean; element: React.ReactNode }>
  >([]);

  useEffect(() => {
    async function renderItems(items: InvestigationItem[]) {
      return await Promise.all(
        items.map(async (item) => {
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
              from: investigation
                ? new Date(investigation.params.timeRange.from).toISOString()
                : new Date().toISOString(),
              to: investigation
                ? new Date(investigation.params.timeRange.to).toISOString()
                : new Date().toISOString(),
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

    if (investigation) {
      renderItems(investigation.items).then((nextRenderableItems) =>
        setRenderableItems(nextRenderableItems)
      );
    }
  }, [investigation, investigate]);

  return renderableItems;
}
