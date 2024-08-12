/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { InvestigateWidgetCreate } from '@kbn/investigate-plugin/public';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import { keyBy, noop } from 'lodash';
import React, { useEffect, useMemo, useRef } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { useDateRange } from '../../hooks/use_date_range';
import { useKibana } from '../../hooks/use_kibana';
import { AddNoteUI } from '../add_note_ui';
import { AddObservationUI } from '../add_observation_ui';
import { InvestigateSearchBar } from '../investigate_search_bar';
import { InvestigateWidgetGrid } from '../investigate_widget_grid';

function InvestigateViewWithUser({ user }: { user: AuthenticatedUser }) {
  const {
    dependencies: {
      start: { investigate },
    },
  } = useKibana();
  const widgetDefinitions = useMemo(() => investigate.getWidgetDefinitions(), [investigate]);
  const [range, setRange] = useDateRange();

  const {
    addItem,
    copyItem,
    deleteItem,
    investigation,
    setGlobalParameters,
    renderableInvestigation,
  } = investigate.useInvestigation({
    user,
    from: range.start.toISOString(),
    to: range.end.toISOString(),
  });

  const createWidget = (widgetCreate: InvestigateWidgetCreate) => {
    return addItem(widgetCreate);
  };

  const createWidgetRef = useRef(createWidget);
  createWidgetRef.current = createWidget;

  useEffect(() => {
    if (
      renderableInvestigation?.parameters.timeRange.from &&
      renderableInvestigation?.parameters.timeRange.to &&
      range.start.toISOString() !== renderableInvestigation.parameters.timeRange.from &&
      range.end.toISOString() !== renderableInvestigation.parameters.timeRange.to
    ) {
      setRange({
        from: renderableInvestigation.parameters.timeRange.from,
        to: renderableInvestigation.parameters.timeRange.to,
      });
    }
  }, [
    renderableInvestigation?.parameters.timeRange.from,
    renderableInvestigation?.parameters.timeRange.to,
    range.start,
    range.end,
    setRange,
  ]);

  const gridItems = useMemo(() => {
    const widgetDefinitionsByType = keyBy(widgetDefinitions, 'type');

    return renderableInvestigation?.items.map((item) => {
      const definitionForType = widgetDefinitionsByType[item.type];

      return (
        {
          title: item.title,
          description: item.description ?? '',
          id: item.id,
          element: item.element,
          columns: item.columns,
          rows: item.rows,
          chrome: definitionForType.chrome,
          loading: item.loading,
        } ?? []
      );
    });
  }, [renderableInvestigation, widgetDefinitions]);

  if (!investigation || !renderableInvestigation || !gridItems) {
    return <EuiLoadingSpinner />;
  }

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow={8}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <InvestigateSearchBar
                rangeFrom={range.from}
                rangeTo={range.to}
                onQuerySubmit={async ({ dateRange }) => {
                  const nextDateRange = {
                    from: datemath.parse(dateRange.from)!.toISOString(),
                    to: datemath.parse(dateRange.to)!.toISOString(),
                  };
                  await setGlobalParameters({
                    ...renderableInvestigation.parameters,
                    timeRange: nextDateRange,
                  });

                  setRange(nextDateRange);
                }}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <InvestigateWidgetGrid
                items={gridItems}
                onItemsChange={async (nextGridItems) => {
                  noop();
                }}
                onItemCopy={async (copiedItem) => {
                  return copyItem(copiedItem.id);
                }}
                onItemDelete={async (deletedItem) => {
                  return deleteItem(deletedItem.id);
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <AddObservationUI
            timeRange={renderableInvestigation.parameters.timeRange}
            onWidgetAdd={(widget) => {
              return createWidgetRef.current(widget);
            }}
          />
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={2}>
        <AddNoteUI
          user={user}
          timeRange={renderableInvestigation.parameters.timeRange}
          onWidgetAdd={(widget) => {
            return createWidgetRef.current(widget);
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function InvestigateView({}: {}) {
  const {
    core: { security },
  } = useKibana();

  const user = useAsync(() => {
    return security.authc.getCurrentUser();
  }, [security]);

  return user.value ? <InvestigateViewWithUser user={user.value} /> : null;
}
