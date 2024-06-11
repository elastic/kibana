/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import {
  GlobalWidgetParameters,
  InvestigateUser,
  InvestigateWidget,
  InvestigateWidgetColumnSpan,
  InvestigateWidgetCreate,
  WorkflowBlock,
} from '@kbn/investigate-plugin/public';
import { WidgetDefinition } from '@kbn/investigate-plugin/public/types';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { keyBy, last, omit, pick } from 'lodash';
import { rgba } from 'polished';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { v4 } from 'uuid';
import { DATE_FORMAT_ID } from '@kbn/management-settings-ids';
import { useDateRange } from '../../hooks/use_date_range';
import { useKibana } from '../../hooks/use_kibana';
import { useMemoWithAbortSignal } from '../../hooks/use_memo_with_abort_signal';
import { MiniMapContextProvider } from '../../hooks/use_mini_map';
import { useStickToBottom } from '../../hooks/use_stick_to_bottom';
import { useTheme } from '../../hooks/use_theme';
import { getOverridesFromGlobalParameters } from '../../utils/get_overrides_from_global_parameters';
import { AddWidgetUI } from '../add_widget_ui';
import { InvestigateDetail } from '../investigate_detail';
import { InvestigateSearchBar } from '../investigate_search_bar';
import { InvestigateWidgetGrid, InvestigateWidgetGridItem } from '../investigate_widget_grid';
import { InvestigationHistory } from '../investigation_history';
import { MiniTimeline } from '../mini_timeline';
import { InvestigateTimelineWithLoadingState } from './types';
import { mergePlainObjects } from '../../utils/merge_plain_objects';
import { EditWidgetFlyout } from '../edit_widget_flyout';

const DEFAULT_COLUMN_SPAN = InvestigateWidgetColumnSpan.Four;
const DEFAULT_ROW_SPAN = 12;

const containerClassName = css`
  overflow-x: auto;
  overflow-y: auto;
  padding: 24px 24px 0px 24px;
`;

const scrollContainerClassName = css`
  overflow-x: clip;
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

async function regenerateItem({
  user,
  widgetDefinitions,
  signal,
  widget,
  globalWidgetParameters,
}: {
  user: InvestigateUser;
  widgetDefinitions: WidgetDefinition[];
  widget: InvestigateWidgetCreate | InvestigateWidget;
  signal: AbortSignal;
  globalWidgetParameters: GlobalWidgetParameters;
}): Promise<InvestigateWidget> {
  const now = Date.now();

  const definition = widgetDefinitions.find(
    (currentDefinition) => currentDefinition.type === widget.type
  );

  if (!definition) {
    throw new Error(`Definition for widget ${widget.type} not found`);
  }

  const nextParameters = mergePlainObjects(
    globalWidgetParameters,
    widget.parameters,
    widget.locked ? {} : globalWidgetParameters
  );

  const widgetData = await definition.generate({
    parameters: nextParameters,
    signal,
  });

  return {
    created: now,
    id: v4(),
    ...widget,
    parameters: nextParameters,
    data: widgetData,
    user,
    last_updated: now,
  };
}

export function InvestigateView({}: {}) {
  const user = useMemo(
    () => ({
      name: 'elastic',
    }),
    []
  );

  const {
    core: { notifications, uiSettings },
    dependencies: {
      start: { investigate },
    },
  } = useKibana();

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

  const { ref: stickToBottomRef, stickToBottom } = useStickToBottom();

  const [timeline, setTimeline] = useState<InvestigateTimelineWithLoadingState>({
    '@timestamp': new Date().getTime(),
    id: v4(),
    items: [],
    user,
    title: new Date().toISOString(),
  });

  const [editingItem, setEditingItem] = useState<InvestigateWidget | undefined>(undefined);

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

  const createWidget = (widgetCreate: InvestigateWidgetCreate) => {
    stickToBottom();
    return regenerateItem({
      widget: widgetCreate,
      signal: new AbortController().signal,
      globalWidgetParameters,
      user,
      widgetDefinitions,
    })
      .then((generatedWidget) => {
        setTimeline((currentTimeline) => {
          return {
            ...currentTimeline,
            items: currentTimeline.items.concat({
              ...generatedWidget,
              loading: false,
            }),
          };
        });
      })
      .catch((error) => {
        notifications.showErrorDialog({
          title: i18n.translate('xpack.investigateApp.failedToAddWidget', {
            defaultMessage: 'Failed to add widget',
          }),
          error,
        });
      });
  };

  const createWidgetRef = useRef(createWidget);

  createWidgetRef.current = createWidget;

  const [blocks, setBlocks] = useState<Record<string, WorkflowBlock[]>>({});

  useEffect(() => {
    const itemIds = timeline.items.map((item) => item.id);
    setEditingItem((prevEditingItem) => {
      if (prevEditingItem && !itemIds.includes(prevEditingItem.id)) {
        return undefined;
      }
      return prevEditingItem;
    });
    setBlocks((prevBlocks) => {
      return pick(prevBlocks, itemIds);
    });
  }, [timeline.items]);

  const gridItems = useMemo(() => {
    const widgetDefinitionsByType = keyBy(widgetDefinitions, 'type');

    return timeline.items.map((item): InvestigateWidgetGridItem => {
      const definitionForType = widgetDefinitionsByType[item.type];

      const element = definitionForType.render({
        widget: item,
        onDelete: () => {
          setTimeline((prevTimeline) => ({
            ...prevTimeline,
            items: prevTimeline.items.filter((itemAtIndex) => itemAtIndex.id !== item.id),
          }));
        },
        onWidgetAdd: (create) => {
          return createWidgetRef.current(create);
        },
        blocks: {
          publish: (blocksForItem) => {
            const nextPublishedBlockIds = blocksForItem.map((block) => block.id);

            setBlocks((prevBlocks) => ({
              ...prevBlocks,
              [item.id]: (prevBlocks[item.id] ?? [])
                .filter((block) => !nextPublishedBlockIds.includes(block.id))
                .concat(blocksForItem),
            }));
            return () => {
              setBlocks((prevBlocks) => ({
                ...prevBlocks,
                [item.id]: prevBlocks[item.id].filter((block) =>
                  nextPublishedBlockIds.includes(block.id)
                ),
              }));
            };
          },
        },
      });

      return {
        title: item.title,
        description: item.description ?? '',
        id: item.id,
        element,
        columns: item.columns || DEFAULT_COLUMN_SPAN,
        rows: item.rows || DEFAULT_ROW_SPAN,
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
  }, [timeline.items, widgetDefinitions, globalWidgetParameters, uiSettings]);

  const regenerateCallback = useMemoWithAbortSignal(
    (currentSignal) => {
      return ({
        globalWidgetParameters: nextGlobalWidgetParameters,
        items,
      }: {
        globalWidgetParameters: GlobalWidgetParameters;
        items: InvestigateWidget[];
      }) => {
        setTimeline((nextTimeline) => {
          return {
            ...nextTimeline,
            items: nextTimeline.items.map((widget) => ({
              ...widget,
              loading: widget.locked ? false : true,
            })),
          };
        });

        Promise.all(
          items.map(async (widget) => {
            if (widget.locked) {
              return widget;
            }
            return regenerateItem({
              globalWidgetParameters: nextGlobalWidgetParameters,
              signal: currentSignal,
              user,
              widget,
              widgetDefinitions,
            }).then((updatedWidget) => {
              setTimeline((nextTimeline) => {
                return {
                  ...nextTimeline,
                  items: nextTimeline.items.map((item) => {
                    if (item.id === widget.id) {
                      return {
                        ...updatedWidget,
                        loading: false,
                      };
                    }
                    return item;
                  }),
                };
              });
            });
          })
        )
          .catch((error) => {
            if (error instanceof AbortError) {
              return;
            }

            notifications.showErrorDialog({
              title: i18n.translate('xpack.investigateApp.errorGeneratingWidgets', {
                defaultMessage: 'Failed to regenerate widgets',
              }),
              error,
            });
          })
          .finally(() => {
            setTimeline((nextTimeline) => {
              return {
                ...nextTimeline,
                items: nextTimeline.items.map((widget) => ({
                  ...widget,
                  loading: false,
                })),
              };
            });
          });
      };
    },
    [user, widgetDefinitions, notifications]
  );

  const regenerateCallbackRef = useRef(regenerateCallback);

  regenerateCallbackRef.current = regenerateCallback;

  const itemsRef = useRef(timeline.items);

  itemsRef.current = timeline.items;

  useEffect(() => {
    regenerateCallbackRef.current({ globalWidgetParameters, items: itemsRef.current });
  }, [globalWidgetParameters]);

  const [scrollableContainer, setScrollableContainer] = useState<HTMLElement | null>(null);

  const [searchBarFocused, setSearchBarFocused] = useState(false);

  const lastTimelineItemId = last(timeline.items)?.id;

  const activeWorkflowBlocks = useMemo(() => {
    return (lastTimelineItemId && blocks[lastTimelineItemId]) || [];
  }, [blocks, lastTimelineItemId]);

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
                  setTimeline((prevTimeline) => {
                    const itemsById = keyBy(prevTimeline.items, 'id');
                    return {
                      ...prevTimeline,
                      items: nextGridItems.map((gridItem) => {
                        const item = itemsById[gridItem.id];

                        return {
                          ...item,
                          columns: gridItem.columns,
                          rows: gridItem.rows,
                        };
                      }),
                    };
                  });
                }}
                onItemTitleChange={async (item, title) => {
                  setTimeline((prevTimeline) => {
                    return {
                      ...prevTimeline,
                      items: prevTimeline.items.map((itemAtIndex) => {
                        if (itemAtIndex.id === item.id) {
                          return { ...itemAtIndex, title };
                        }

                        return itemAtIndex;
                      }),
                    };
                  });
                }}
                onItemCopy={async (copiedItem) => {
                  setTimeline((prevTimeline) => {
                    const matchedItem = prevTimeline.items.find(
                      (item) => item.id === copiedItem.id
                    );

                    if (!matchedItem) {
                      throw new Error('Could not find item that was copied');
                    }

                    const now = new Date().getTime();
                    return {
                      ...prevTimeline,
                      items: prevTimeline.items.concat({
                        ...matchedItem,
                        id: v4(),
                        created: now,
                        last_updated: now,
                        user,
                      }),
                    };
                  });
                }}
                onItemDelete={async (deletedItem) => {
                  setTimeline((prevTimeline) => ({
                    ...prevTimeline,
                    items: prevTimeline.items.filter((item) => item.id !== deletedItem.id),
                  }));
                }}
                onItemLockToggle={async (toggledItem) => {
                  const nextLocked = !toggledItem.locked;

                  let updatedWidget = timeline.items.find((item) => item.id === toggledItem.id)!;

                  if (!nextLocked) {
                    updatedWidget = {
                      ...(await regenerateItem({
                        user,
                        globalWidgetParameters,
                        signal: new AbortController().signal,
                        widget: {
                          ...updatedWidget,
                          locked: nextLocked,
                        },
                        widgetDefinitions,
                      })),
                      loading: false,
                    };
                  }

                  setTimeline((nextTimeline) => {
                    return {
                      ...nextTimeline,
                      items: nextTimeline.items.map((item) => {
                        if (item.id === updatedWidget.id) {
                          return {
                            ...updatedWidget,
                            locked: nextLocked,
                          };
                        }
                        return item;
                      }),
                    };
                  });
                }}
                fadeLockedItems={searchBarFocused}
                onItemOverrideRemove={async (updatedItem, override) => {
                  let updatedWidget = timeline.items.find((item) => item.id === updatedItem.id)!;

                  updatedWidget = {
                    ...(await regenerateItem({
                      user,
                      globalWidgetParameters,
                      signal: new AbortController().signal,
                      widget: {
                        ...updatedWidget,
                        parameters: omit(updatedWidget.parameters, override.id),
                      },
                      widgetDefinitions,
                    })),
                    loading: false,
                  };

                  setTimeline((nextTimeline) => {
                    return {
                      ...nextTimeline,
                      items: nextTimeline.items.map((item) => {
                        if (item.id === updatedWidget.id) {
                          return updatedWidget;
                        }
                        return item;
                      }),
                    };
                  });
                }}
                onItemEditClick={(itemToEdit) => {
                  setEditingItem(timeline.items.find((item) => item.id === itemToEdit.id));
                }}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false} className={addWidgetContainerClassName}>
              <AddWidgetUI
                workflowBlocks={activeWorkflowBlocks}
                user={user}
                timeline={timeline}
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
                timeline={timeline}
                onLockAllClick={async () => {
                  setTimeline((nextTimeline) => {
                    return {
                      ...nextTimeline,
                      items: nextTimeline.items.map((item) => ({ ...item, locked: true })),
                    };
                  });
                }}
                onUnlockAllClick={async () => {
                  const itemsToUnlock = timeline.items.filter((item) => item.locked);

                  await Promise.all(
                    itemsToUnlock.map(async (itemToRegenerate) => {
                      setTimeline((nextTimeline) => {
                        return {
                          ...nextTimeline,
                          items: nextTimeline.items.map((itemAtIndex) => {
                            if (itemAtIndex.id === itemToRegenerate.id) {
                              return { ...itemAtIndex, loading: true };
                            }
                            return itemAtIndex;
                          }),
                        };
                      });

                      const regeneratedItem = await regenerateItem({
                        user,
                        widgetDefinitions,
                        signal: new AbortController().signal,
                        widget: itemToRegenerate,
                        globalWidgetParameters,
                      });
                      setTimeline((nextTimeline) => {
                        return {
                          ...nextTimeline,
                          items: nextTimeline.items.map((itemAtIndex) => {
                            if (itemAtIndex.id === itemToRegenerate.id) {
                              return { ...regeneratedItem, loading: false, locked: false };
                            }
                            return itemAtIndex;
                          }),
                        };
                      });
                    })
                  );
                }}
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
            const updatedWidget = await regenerateItem({
              globalWidgetParameters,
              user,
              widget: nextWidget,
              widgetDefinitions,
              signal: new AbortController().signal,
            });

            setTimeline((prevTimeline) => {
              return {
                ...prevTimeline,
                items: prevTimeline.items.map((item) => {
                  if (item.id === updatedWidget.id) {
                    return { ...updatedWidget, loading: false };
                  }
                  return item;
                }),
              };
            });
          }}
          onClose={() => {
            setEditingItem(undefined);
          }}
        />
      ) : null}
    </MiniMapContextProvider>
  );
}
