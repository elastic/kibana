/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { css } from '@emotion/css';
import type {
  GlobalWidgetParameters,
  InvestigateWidget,
  InvestigateWidgetCreate,
} from '@kbn/investigate-plugin/public';
import { DATE_FORMAT_ID } from '@kbn/management-settings-ids';
import { keyBy, omit, pick } from 'lodash';
import { rgba } from 'polished';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import { v4 } from 'uuid';
import { useDateRange } from '../../hooks/use_date_range';
import { useKibana } from '../../hooks/use_kibana';
import { MiniMapContextProvider } from '../../hooks/use_mini_map';
import { useStickToBottom } from '../../hooks/use_stick_to_bottom';
import { useTheme } from '../../hooks/use_theme';
import { getOverridesFromGlobalParameters } from '../../utils/get_overrides_from_global_parameters';
import { AddWidgetUI } from '../add_widget_ui';
import { EditWidgetFlyout } from '../edit_widget_flyout';
import { InvestigateDetail } from '../investigate_detail';
import { InvestigateSearchBar } from '../investigate_search_bar';
import { InvestigateWidgetGrid } from '../investigate_widget_grid';
import { InvestigationHistory } from '../investigation_history';
import { MiniTimeline } from '../mini_timeline';
import { useInvestigateParams } from '../../hooks/use_investigate_params';
import { useInvestigateRouter } from '../../hooks/use_investigate_router';

const containerClassName = css`
  overflow: auto;
  padding: 24px 24px 0px 24px;
`;

const scrollContainerClassName = css`
  min-width: 1px;
`;

const addWidgetContainerClassName = css`
  width: 100%;
  padding-bottom: 24px;
`;

const gridContainerClassName = css`
  position: relative;
`;

const sideBarClassName = css`
  width: 240px;
  position: sticky;
  top: 0;
  padding: 0px 12px 32px 12px;
`;

function InvestigateViewWithUser({ user }: { user: AuthenticatedUser }) {
  const {
    core: { uiSettings },
    dependencies: {
      start: { investigate },
    },
  } = useKibana();

  const { path, query } = useInvestigateParams('/*');

  const investigateRouter = useInvestigateRouter();

  const investigationIdFromPath = path && 'id' in path ? path.id : undefined;
  const revisionIdFromPath = query && 'revision' in query ? query.revision : undefined;

  const [kuery, setKuery] = useState('');

  const theme = useTheme();

  const backgroundColorOpaque = rgba(theme.colors.emptyShade, 1);
  const backgroundColorTransparent = rgba(theme.colors.emptyShade, 0);

  const searchBarContainerClassName = css`
    position: sticky;
    top: -8px;
    padding: 8px 0px;
    margin: -8px 0px;
    background: linear-gradient(
      to bottom,
      ${backgroundColorTransparent} 0%,
      ${backgroundColorOpaque} 8px,
      ${backgroundColorOpaque} calc(100% - 8px),
      ${backgroundColorTransparent} 100%
    );
    z-index: 100;
  `;

  const [range, setRange] = useDateRange();

  const widgetDefinitions = useMemo(() => investigate.getWidgetDefinitions(), [investigate]);

  const [filterOverrides, setFilterOverrides] = useState(() => {
    return {
      kuery,
    };
  });

  const globalWidgetParameters: GlobalWidgetParameters = useMemo(() => {
    return {
      filters: [],
      query: {
        query: filterOverrides.kuery,
        language: 'kuery',
      },
      timeRange: {
        from: range.start.toISOString(),
        to: range.end.toISOString(),
      },
    };
  }, [range, filterOverrides]);

  const { ref: stickToBottomRef, stickToBottom } = useStickToBottom();

  const {
    addItem,
    setItemPositions,
    setItemTitle,
    blocks,
    copyItem,
    deleteItem,
    hasUnsavedChanges,
    investigation,
    isAtEarliestRevision,
    isAtLatestRevision,
    loadInvestigation,
    lockItem,
    setGlobalParameters,
    setItemParameters,
    startNewInvestigation,
    unlockItem,
    revision,
    updateItem,
    setRevision,
    isNewInvestigation,
  } = investigate.useInvestigation({
    user,
    from: range.start.toISOString(),
    to: range.end.toISOString(),
  });

  const [editingItem, setEditingItem] = useState<InvestigateWidget | undefined>(undefined);

  const addItemRef = useRef(addItem);
  addItemRef.current = addItem;

  const createWidget = (widgetCreate: InvestigateWidgetCreate) => {
    stickToBottom();
    return addItemRef.current(widgetCreate);
  };

  const createWidgetRef = useRef(createWidget);

  createWidgetRef.current = createWidget;

  useEffect(() => {
    const itemIds = revision.items.map((item) => item.id) ?? [];
    setEditingItem((prevEditingItem) => {
      if (prevEditingItem && !itemIds.includes(prevEditingItem.id)) {
        return undefined;
      }
      return prevEditingItem;
    });
  }, [revision]);

  const gridItems = useMemo(() => {
    const widgetDefinitionsByType = keyBy(widgetDefinitions, 'type');

    return revision.items.map((item) => {
      const definitionForType = widgetDefinitionsByType[item.type];

      return {
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
              pick(item.parameters, 'filters', 'query', 'timeRange'),
              globalWidgetParameters,
              uiSettings.get<string>(DATE_FORMAT_ID) ?? 'Browser'
            )
          : [],
      };
    });
  }, [revision, widgetDefinitions, globalWidgetParameters, uiSettings]);

  const [scrollableContainer, setScrollableContainer] = useState<HTMLElement | null>(null);

  const [searchBarFocused, setSearchBarFocused] = useState(false);

  useEffect(() => {
    setGlobalParameters(globalWidgetParameters);
  }, [globalWidgetParameters, setGlobalParameters]);

  useEffect(() => {
    if (investigationIdFromPath && investigation.id === investigationIdFromPath) {
      return;
    }

    if (investigationIdFromPath) {
      loadInvestigation(investigationIdFromPath);
    } else if (!investigationIdFromPath && !isNewInvestigation) {
      const id = v4();
      // startNewInvestigation(id);
    }
  }, [
    investigationIdFromPath,
    loadInvestigation,
    startNewInvestigation,
    investigateRouter,
    investigation.id,
    isNewInvestigation,
  ]);

  useEffect(() => {
    if (revisionIdFromPath) {
      setRevision(revisionIdFromPath);
    }
  }, [revisionIdFromPath, setRevision, startNewInvestigation]);

  useEffect(() => {
    if (isNewInvestigation) {
      return;
    }

    // investigateRouter.push('/{id}', {
    //   path: {
    //     id: investigation.id,
    //   },
    //   query: {
    //     revision: !isAtLatestRevision ? revision.id : undefined,
    //   },
    // });
  }, [investigation.id, revision.id, investigateRouter, isAtLatestRevision, isNewInvestigation]);

  return (
    <MiniMapContextProvider container={scrollableContainer}>
      <EuiFlexGroup direction="row" className={containerClassName}>
        <EuiFlexItem grow className={scrollContainerClassName}>
          <EuiFlexGroup
            direction="column"
            gutterSize="s"
            justifyContent="flexEnd"
            ref={(element) => {
              // the type for `EuiFlexGroup.ref` is not correct
              const asHtmlElement = element as unknown as HTMLDivElement;
              stickToBottomRef(asHtmlElement);
              setScrollableContainer(asHtmlElement);
            }}
          >
            <EuiFlexItem className={searchBarContainerClassName}>
              <InvestigateSearchBar
                kuery={kuery}
                rangeFrom={range.from}
                rangeTo={range.to}
                onQuerySubmit={({ kuery: nextKuery, dateRange: nextDateRange }) => {
                  setRange(nextDateRange);
                  setFilterOverrides((prevOverrides) => ({ ...prevOverrides, kuery: nextKuery }));
                }}
                onQueryChange={({ kuery: nextKuery }) => {
                  setKuery(nextKuery);
                }}
                onFocus={() => {
                  setSearchBarFocused(true);
                }}
                onBlur={() => {
                  setSearchBarFocused(false);
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem className={gridContainerClassName} grow={false}>
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
                      ...globalWidgetParameters,
                      ...omit(itemToUpdate.parameters, override.id),
                    });
                  }
                }}
                onItemEditClick={(itemToEdit) => {
                  setEditingItem(revision.items.find((item) => item.id === itemToEdit.id));
                }}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false} className={addWidgetContainerClassName}>
              <AddWidgetUI
                workflowBlocks={blocks}
                user={user}
                revision={revision}
                assistantAvailable={true}
                start={range.start}
                end={range.end}
                filters={globalWidgetParameters.filters}
                query={globalWidgetParameters.query}
                timeRange={globalWidgetParameters.timeRange}
                onWidgetAdd={(widget) => {
                  return createWidgetRef.current(widget);
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false} className={sideBarClassName}>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem grow={false}>
              <InvestigateDetail
                investigation={investigation}
                revision={revision}
                isAtEarliestRevision={isAtEarliestRevision}
                isAtLatestRevision={isAtLatestRevision}
                hasUnsavedChanges={hasUnsavedChanges}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHorizontalRule margin="none" />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <InvestigationHistory investigations={[]} loading={false} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <MiniTimeline />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {editingItem ? (
        <EditWidgetFlyout
          widget={editingItem}
          onWidgetUpdate={async (nextWidget) => {
            return updateItem(nextWidget);
          }}
          onClose={() => {
            setEditingItem(undefined);
          }}
        />
      ) : null}
    </MiniMapContextProvider>
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
