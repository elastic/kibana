/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import { noop } from 'lodash';
import React from 'react';
import { InvestigateSearchBar } from '../../../../components/investigate_search_bar';
import { InvestigateWidgetGrid } from '../../../../components/investigate_widget_grid';
import { useFetchInvestigation } from '../../../../hooks/use_fetch_investigation';
import { useRenderItems } from '../../hooks/use_render_items';
import { InvestigationNotes } from '../investigation_notes/investigation_notes';
import { AddObservationUI } from '../../../../components/add_observation_ui';

interface Props {
  user: AuthenticatedUser;
  investigationId: string;
}

export function InvestigationDetails({ user, investigationId }: Props) {
  const { data: investigation } = useFetchInvestigation({ id: investigationId });
  const renderableItems = useRenderItems({ investigation });

  if (!investigation || !renderableItems) {
    return <EuiLoadingSpinner />;
  }

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow={8}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexGroup direction="column" gutterSize="m">
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

          <AddObservationUI
            timeRange={{
              from: new Date(investigation.params.timeRange.from).toISOString(),
              to: new Date(investigation.params.timeRange.to).toISOString(),
            }}
            onWidgetAdd={(widget) => {
              return Promise.resolve();
              // addWidget(widget);
            }}
          />
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={2}>
        <InvestigationNotes investigationId={investigationId} initialNotes={investigation.notes} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
