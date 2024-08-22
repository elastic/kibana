/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InvestigationItem } from '@kbn/investigation-shared';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import { noop } from 'lodash';
import React, { useEffect } from 'react';
import { InvestigateSearchBar } from '../../../../components/investigate_search_bar';
import { InvestigateWidgetGrid } from '../../../../components/investigate_widget_grid';
import { useFetchInvestigation } from '../../../../hooks/use_fetch_investigation';
import { useKibana } from '../../../../hooks/use_kibana';
import { InvestigationNotes } from '../investigation_notes/investigation_notes';

export function InvestigationDetails({
  user,
  investigationId,
}: {
  user: AuthenticatedUser;
  investigationId: string;
}) {
  const {
    dependencies: {
      start: { investigate },
    },
  } = useKibana();
  const { data: investigation } = useFetchInvestigation({ id: investigationId });

  const [renderableItems, setRenderableItems] = React.useState<
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

          const data = await itemDefinition.generate({
            item,
            params: {
              timeRange: {
                from: investigation
                  ? new Date(investigation.params.timeRange.from).toISOString()
                  : new Date().toISOString(),
                to: investigation
                  ? new Date(investigation.params.timeRange.to).toISOString()
                  : new Date().toISOString(),
              },
            },
          });

          return Promise.resolve({
            ...item,
            loading: false,
            element: itemDefinition.render({
              data,
              item,
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
  }, [investigation]);

  if (!investigation || !renderableItems) {
    return <EuiLoadingSpinner />;
  }

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow={8}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <InvestigateSearchBar
                dateRangeFrom={
                  investigation
                    ? new Date(investigation.params.timeRange.from).toISOString()
                    : undefined
                }
                dateRangeTo={
                  investigation
                    ? new Date(investigation.params.timeRange.to).toISOString()
                    : undefined
                }
                onQuerySubmit={async ({ dateRange }) => {
                  // const nextDateRange = {
                  //   from: datemath.parse(dateRange.from)!.toISOString(),
                  //   to: datemath.parse(dateRange.to)!.toISOString(),
                  // };
                  // await setGlobalParameters({
                  //   ...renderableInvestigation.parameters,
                  //   timeRange: nextDateRange,
                  // });
                }}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <InvestigateWidgetGrid
                items={renderableItems}
                onItemCopy={async (copiedItem) => {
                  return noop(); // copyItem(copiedItem.id);
                }}
                onItemDelete={async (deletedItem) => {
                  return noop(); // deleteItem(deletedItem.id);
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          {/* <AddObservationUI
            timeRange={investigation.params.timeRange}
            onWidgetAdd={(widget) => {
              return addItem(widget);
            }}
          /> */}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={2}>
        <InvestigationNotes investigationId={investigationId} initialNotes={investigation.notes} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
