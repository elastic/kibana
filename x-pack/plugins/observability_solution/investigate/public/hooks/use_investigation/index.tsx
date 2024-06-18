/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { v4 } from 'uuid';
import { keyBy, last, omit } from 'lodash';
import type { AuthenticatedUser, NotificationsStart } from '@kbn/core/public';
import type { GlobalWidgetParameters } from '../..';
import type {
  InvestigateWidget,
  InvestigateWidgetCreate,
  Investigation,
  InvestigationRevision,
  WorkflowBlock,
} from '../../../common';
import { mergePlainObjects } from '../../../common/utils/merge_plain_objects';
import type { WidgetDefinition } from '../../types';
import {
  InvestigateWidgetApiContextProvider,
  UseInvestigateWidgetApi,
} from '../use_investigate_widget';
import { createNewInvestigation } from './create_new_investigation';

export type RenderableInvestigateWidget = InvestigateWidget & {
  loading: boolean;
  element: React.ReactNode;
};

export type RenderableInvestigationRevision = Omit<StatefulInvestigationRevision, 'items'> & {
  items: RenderableInvestigateWidget[];
};

export type RenderableInvestigateTimeline = Omit<StatefulInvestigation, 'revisions'> & {
  revisions: RenderableInvestigationRevision[];
};

type StatefulInvestigateWidget = InvestigateWidget & {
  loading: boolean;
  Component: React.ComponentType<{ widget: InvestigateWidget }>;
};

type StatefulInvestigation = Omit<Investigation, 'revisions'> & {
  persisted: boolean;
  revisions: StatefulInvestigationRevision[];
};

type StatefulInvestigationRevision = Omit<InvestigationRevision, 'items'> & {
  items: StatefulInvestigateWidget[];
};

export interface UseInvestigationApi {
  startNewInvestigation: (id: string) => void;
  loadInvestigation: (id: string) => void;
  investigation: Omit<StatefulInvestigation, 'revisions'>;
  revision: RenderableInvestigationRevision;
  hasUnsavedChanges: boolean;
  isAtLatestRevision: boolean;
  isAtEarliestRevision: boolean;
  setItemPositions: (
    positions: Array<{ id: string; columns: number; rows: number }>
  ) => Promise<void>;
  setItemTitle: (id: string, title: string) => Promise<void>;
  copyItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addItem: (options: InvestigateWidgetCreate) => Promise<void>;
  updateItem: (widget: InvestigateWidget) => Promise<void>;
  lockItem: (id: string) => Promise<void>;
  unlockItem: (id: string) => Promise<void>;
  setItemParameters: (
    id: string,
    parameters: GlobalWidgetParameters & Record<string, any>
  ) => Promise<void>;
  setGlobalParameters: (parameters: GlobalWidgetParameters) => Promise<void>;
  blocks: WorkflowBlock[];
  setRevision: (revisionId: string) => void;
  isNewInvestigation: boolean;
}

async function regenerateItem({
  user,
  widgetDefinitions,
  signal,
  widget,
  globalWidgetParameters,
}: {
  user: AuthenticatedUser;
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

function useInvestigationWithoutContext({
  user,
  notifications,
  widgetDefinitions,
  from,
  to,
}: {
  user: AuthenticatedUser;
  notifications: NotificationsStart;
  widgetDefinitions: WidgetDefinition[];
  from: string;
  to: string;
}): UseInvestigationApi {
  const [investigation, setInvestigation] = useState<StatefulInvestigation>({
    ...createNewInvestigation({
      user,
      globalWidgetParameters: {
        query: {
          language: 'kuery',
          query: '',
        },
        timeRange: {
          from,
          to,
        },
        filters: [],
      },
    }),
    persisted: false,
  } as StatefulInvestigation);

  const currentRevision = useMemo(() => {
    return investigation.revisions.find((revision) => revision.id === investigation.revision)!;
  }, [investigation.revision, investigation.revisions]);

  const isAtEarliestRevision = investigation.revisions[0].id === currentRevision.id;

  const isAtLatestRevision = last(investigation.revisions)?.id === currentRevision.id;

  const isNewInvestigation = investigation.revisions.length === 1 && !investigation.persisted;

  const hasUnsavedChanges = !!investigation.persisted;

  const [blocksById, setBlocksById] = useState<Record<string, WorkflowBlock[]>>({});

  const updateInvestigation = useCallback(
    (cb: (prevRevision: StatefulInvestigationRevision) => StatefulInvestigationRevision) => {
      setInvestigation((prevInvestigation) => {
        const curRevision = prevInvestigation.revisions.find(
          (revision) => revision.id === prevInvestigation.revision
        )!;

        const nextRevision = {
          ...cb(curRevision),
          id: v4(),
        };

        const nextInvestigation = {
          ...prevInvestigation,
          persisted: false,
          revisions: prevInvestigation.revisions.concat(nextRevision),
          revision: nextRevision.id,
        };

        return nextInvestigation;
      });
    },
    []
  );

  const updateItem = useCallback(
    (id: string, cb: (widget: InvestigateWidget) => Promise<Partial<InvestigateWidget>>): void => {
      updateInvestigation((prevInvestigation) => {
        const foundItem = prevInvestigation.items.find((item) => item.id === id);
        if (!foundItem) {
          return prevInvestigation;
        }
        const next = {
          ...prevInvestigation,
          items: prevInvestigation.items.map((item) => {
            if (item.id === id) {
              return { ...item, loading: true };
            }
            return item;
          }),
        };

        cb(foundItem)
          .then((props) => {
            return { ...props, loading: false };
          })
          .catch(() => {
            return { loading: false };
          })
          .then((props) => {
            updateInvestigation((_prevInvestigation) => {
              return {
                ..._prevInvestigation,
                items: prevInvestigation.items.map((item) => {
                  if (item.id === id) {
                    return { ...item, ...props };
                  }
                  return item;
                }),
              };
            });
          });

        return next;
      });
    },
    [updateInvestigation]
  );

  const updateItemForApi = useCallback(
    async (widget: InvestigateWidget) => {
      return updateItem(widget.id, async () => {
        return regenerateItem({
          globalWidgetParameters: currentRevision.parameters,
          signal: new AbortController().signal,
          user,
          widget,
          widgetDefinitions,
        });
      });
    },
    [currentRevision.parameters, user, widgetDefinitions, updateItem]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      setBlocksById((prevBlocks) => omit(prevBlocks, id));
      updateInvestigation((prevInvestigation) => {
        return {
          ...prevInvestigation,
          items: prevInvestigation.items.filter((item) => item.id !== id),
        };
      });
    },
    [updateInvestigation]
  );

  const deleteItemRef = useRef(deleteItem);
  deleteItemRef.current = deleteItem;

  const addItem = useCallback(
    async (widget: InvestigateWidgetCreate) => {
      try {
        const widgetWithData = await regenerateItem({
          widgetDefinitions,
          globalWidgetParameters: currentRevision.parameters,
          signal: new AbortController().signal,
          user: user!,
          widget,
        });

        const widgetDefinition = widgetDefinitions.find(
          (definition) => definition.type === widget.type
        );

        const api: UseInvestigateWidgetApi = {
          onWidgetAdd: async (create) => {
            return addItemRef.current(create);
          },
          blocks: {
            publish: (nextBlocks) => {
              const nextIds = nextBlocks.map((block) => block.id);
              setBlocksById((prevBlocksById) => ({
                ...prevBlocksById,
                [widgetWithData.id]: (prevBlocksById[widgetWithData.id] ?? []).concat(nextBlocks),
              }));
              return () => {
                setBlocksById((prevBlocksById) => ({
                  ...prevBlocksById,
                  [widgetWithData.id]: (prevBlocksById[widgetWithData.id] ?? []).filter(
                    (block) => !nextIds.includes(block.id)
                  ),
                }));
              };
            },
          },
        };

        const withComponent: StatefulInvestigateWidget = {
          ...widgetWithData,
          loading: false,
          Component: (props) => (
            <InvestigateWidgetApiContextProvider value={api}>
              {widgetDefinition
                ? widgetDefinition.render({
                    blocks: api.blocks,
                    onWidgetAdd: api.onWidgetAdd,
                    onDelete: () => {
                      return deleteItemRef.current(widgetWithData.id);
                    },
                    widget: props.widget,
                  })
                : undefined}
            </InvestigateWidgetApiContextProvider>
          ),
        };

        setBlocksById((prevBlocksById) => ({ ...prevBlocksById, [widgetWithData.id]: [] }));

        updateInvestigation((prevInvestigation) => {
          return { ...prevInvestigation, items: prevInvestigation.items.concat(withComponent) };
        });
      } catch (error) {
        notifications.showErrorDialog({
          title: i18n.translate('xpack.investigate.failedToAddWidget', {
            defaultMessage: 'Failed to add widget',
          }),
          error,
        });
      }
    },
    [updateInvestigation, currentRevision.parameters, user, widgetDefinitions, notifications]
  );

  const addItemRef = useRef(addItem);
  addItemRef.current = addItem;

  const renderableRevision = useMemo(() => {
    return {
      ...currentRevision,
      items: currentRevision.items.map((item) => {
        const { Component, ...rest } = item;
        return {
          ...rest,
          element: <Component widget={item} />,
        };
      }),
    };
  }, [currentRevision]);

  const startNewInvestigation = useCallback(
    (id: string) => {
      setInvestigation((prevInvestigation) => {
        const lastRevision = last(prevInvestigation.revisions)!;

        const createdInvestigation = createNewInvestigation({
          id,
          user,
          globalWidgetParameters: lastRevision.parameters,
        });

        setBlocksById({});

        return {
          ...createdInvestigation,
          persisted: false,
        } as StatefulInvestigation;
      });
    },
    [user]
  );

  const loadInvestigation = useCallback((id: string) => {}, []);

  const setItemPositions = useCallback(
    async (positions: Array<{ id: string; columns: number; rows: number }>) => {
      updateInvestigation((prevInvestigation) => {
        const itemsById = keyBy(prevInvestigation.items, (item) => item.id);
        return {
          ...prevInvestigation,
          items: positions.map((position) => {
            return {
              ...itemsById[position.id],
              rows: position.rows,
              columns: position.columns,
            };
          }),
        };
      });
    },
    [updateInvestigation]
  );

  const setItemTitle = useCallback(
    async (id: string, title: string) => {
      return updateItem(id, async () => ({ title }));
    },
    [updateItem]
  );

  const copyItem = useCallback(
    async (id: string) => {
      return updateInvestigation((prevInvestigation) => {
        const foundItem = prevInvestigation.items.find((item) => item.id === id);
        return {
          ...prevInvestigation,
          items: foundItem
            ? prevInvestigation.items.concat({ ...foundItem, id: v4() })
            : prevInvestigation.items,
        };
      });
    },
    [updateInvestigation]
  );

  const lockItem = useCallback(
    async (id: string) => {
      return updateItem(id, async () => ({ locked: true }));
    },
    [updateItem]
  );

  const unlockItem = useCallback(
    async (id: string) => {
      return updateItem(id, async (prev) => {
        return regenerateItem({
          user: user!,
          widget: {
            ...prev,
            locked: false,
          },
          signal: new AbortController().signal,
          globalWidgetParameters: currentRevision.parameters,
          widgetDefinitions,
        });
      });
    },
    [updateItem, currentRevision.parameters, user, widgetDefinitions]
  );

  const setItemParameters = useCallback(
    async (id: string, nextGlobalWidgetParameters: GlobalWidgetParameters) => {
      return updateItem(id, (prev) => {
        return regenerateItem({
          user: user!,
          widget: prev,
          signal: new AbortController().signal,
          globalWidgetParameters: nextGlobalWidgetParameters,
          widgetDefinitions,
        });
      });
    },
    [updateItem, user, widgetDefinitions]
  );

  const setGlobalParameters = useCallback(
    async (nextParameters: GlobalWidgetParameters) => {
      updateInvestigation((prevRevision) => {
        Promise.all(
          prevRevision.items.map((item) => {
            if (item.locked) {
              return item;
            }
            return regenerateItem({
              user: user!,
              globalWidgetParameters: nextParameters,
              signal: new AbortController().signal,
              widget: item,
              widgetDefinitions,
            });
          })
        ).then((allUpdatedItems) => {
          updateInvestigation((_prevRevision) => {
            const updatedItemsById = keyBy(allUpdatedItems, (item) => item.id);
            return {
              ..._prevRevision,
              items: _prevRevision.items.map((item) => ({
                ...item,
                ...updatedItemsById[item.id],
                loading: false,
              })),
            };
          });
        });

        return {
          ...prevRevision,
          items: prevRevision.items.map((item) => {
            if (item.locked) {
              return item;
            }
            return { ...item };
          }),
          parameters: nextParameters,
        };
      });
    },
    [updateInvestigation, user, widgetDefinitions]
  );

  const setRevision = useCallback((revisionId: string) => {
    setInvestigation((prevInvestigation) => {
      const revision = prevInvestigation.revisions.find(
        (revisionAtIndex) => revisionAtIndex.id === revisionId
      );

      if (!revision) {
        throw new Error('Could not locate revision for ' + revisionId);
      }

      return {
        ...prevInvestigation,
        revision: revisionId,
        persisted: false,
      };
    });
  }, []);

  const lastItemId = last(currentRevision.items)?.id;

  const blocks = useMemo(() => {
    return lastItemId && blocksById[lastItemId] ? blocksById[lastItemId] : [];
  }, [blocksById, lastItemId]);

  return {
    startNewInvestigation,
    loadInvestigation,
    investigation,
    revision: renderableRevision,
    hasUnsavedChanges,
    isAtLatestRevision,
    isAtEarliestRevision,
    blocks,
    setItemPositions,
    setItemTitle,
    copyItem,
    addItem,
    deleteItem,
    lockItem,
    unlockItem,
    setItemParameters,
    setGlobalParameters,
    updateItem: updateItemForApi,
    setRevision,
    isNewInvestigation,
  };
}

export function createUseInvestigation({
  notifications,
  widgetDefinitions,
}: {
  notifications: NotificationsStart;
  widgetDefinitions: WidgetDefinition[];
}) {
  return ({ user, from, to }: { user: AuthenticatedUser; from: string; to: string }) => {
    return useInvestigationWithoutContext({
      user,
      notifications,
      widgetDefinitions,
      from,
      to,
    });
  };
}
