/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { InvestigateWidget, InvestigateWidgetCreate } from '@kbn/investigate-plugin/public';
import { DATE_FORMAT_ID } from '@kbn/management-settings-ids';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import { keyBy, omit, pick } from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { useDateRange } from '../../hooks/use_date_range';
import { useKibana } from '../../hooks/use_kibana';
import { getOverridesFromGlobalParameters } from '../../utils/get_overrides_from_global_parameters';
import { AddNoteUI } from '../add_note_ui';
import { AddObservationUI } from '../add_observation_ui';
import { InvestigateSearchBar } from '../investigate_search_bar';
import { InvestigateWidgetGrid } from '../investigate_widget_grid';

function InvestigateViewWithUser({ user }: { user: AuthenticatedUser }) {
  const {
    core: { uiSettings },
    dependencies: {
      start: { investigate },
    },
  } = useKibana();
  const widgetDefinitions = useMemo(() => investigate.getWidgetDefinitions(), [investigate]);
  const [range, setRange] = useDateRange();
  const [searchBarFocused, setSearchBarFocused] = useState(false);

  const {
    addItem,
    setItemPositions,
    setItemTitle,
    copyItem,
    deleteItem,
    investigation,
    lockItem,
    setItemParameters,
    setGlobalParameters,
    unlockItem,
    revision,
  } = investigate.useInvestigation({
    user,
    from: range.start.toISOString(),
    to: range.end.toISOString(),
  });

  const [_editingItem, setEditingItem] = useState<InvestigateWidget | undefined>(undefined);

  const createWidget = (widgetCreate: InvestigateWidgetCreate) => {
    return addItem(widgetCreate);
  };

  const createWidgetRef = useRef(createWidget);
  createWidgetRef.current = createWidget;

  useEffect(() => {
    const itemIds = revision?.items.map((item) => item.id) ?? [];
    setEditingItem((prevEditingItem) => {
      if (prevEditingItem && !itemIds.includes(prevEditingItem.id)) {
        return undefined;
      }
      return prevEditingItem;
    });
  }, [revision]);

  useEffect(() => {
    if (
      revision?.parameters.timeRange.from &&
      revision?.parameters.timeRange.to &&
      range.start.toISOString() !== revision.parameters.timeRange.from &&
      range.end.toISOString() !== revision.parameters.timeRange.to
    ) {
      setRange({
        from: revision.parameters.timeRange.from,
        to: revision.parameters.timeRange.to,
      });
    }
  }, [
    revision?.parameters.timeRange.from,
    revision?.parameters.timeRange.to,
    range.start,
    range.end,
    setRange,
  ]);

  const gridItems = useMemo(() => {
    const widgetDefinitionsByType = keyBy(widgetDefinitions, 'type');

    return revision?.items.map((item) => {
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
          locked: item.locked,
          loading: item.loading,
          overrides: item.locked
            ? getOverridesFromGlobalParameters(
                pick(item.parameters, 'filters', 'timeRange'),
                revision.parameters,
                uiSettings.get<string>(DATE_FORMAT_ID) ?? 'Browser'
              )
            : [],
        } ?? []
      );
    });
  }, [revision, widgetDefinitions, uiSettings]);

  if (!investigation || !revision || !gridItems) {
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
                    ...revision.parameters,
                    timeRange: nextDateRange,
                  });

                  setRange(nextDateRange);
                }}
                onFocus={() => {
                  setSearchBarFocused(true);
                }}
                onBlur={() => {
                  setSearchBarFocused(false);
                }}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <InvestigateWidgetGrid
                items={gridItems}
                onItemsChange={async (nextGridItems) => {
                  return setItemPositions(
                    nextGridItems.map((gridItem) => ({
                      columns: gridItem.columns,
                      rows: gridItem.rows,
                      id: gridItem.id,
                    }))
                  );
                }}
                onItemTitleChange={async (item, title) => {
                  return setItemTitle(item.id, title);
                }}
                onItemCopy={async (copiedItem) => {
                  return copyItem(copiedItem.id);
                }}
                onItemDelete={async (deletedItem) => {
                  return deleteItem(deletedItem.id);
                }}
                onItemLockToggle={async (toggledItem) => {
                  return toggledItem.locked ? unlockItem(toggledItem.id) : lockItem(toggledItem.id);
                }}
                fadeLockedItems={searchBarFocused}
                onItemOverrideRemove={async (updatedItem, override) => {
                  // TODO: remove filters
                  const itemToUpdate = revision.items.find((item) => item.id === updatedItem.id);
                  if (itemToUpdate) {
                    return setItemParameters(updatedItem.id, {
                      ...revision.parameters,
                      ...omit(itemToUpdate.parameters, override.id),
                    });
                  }
                }}
                onItemEditClick={(itemToEdit) => {
                  setEditingItem(revision.items.find((item) => item.id === itemToEdit.id));
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <AddObservationUI
            filters={revision.parameters.filters}
            timeRange={revision.parameters.timeRange}
            onWidgetAdd={(widget) => {
              return createWidgetRef.current(widget);
            }}
          />
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={2}>
        <AddNoteUI
          user={user}
          filters={revision.parameters.filters}
          timeRange={revision.parameters.timeRange}
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
