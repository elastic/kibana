/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AuthenticatedUser, NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { last, omit, pull } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { v4 } from 'uuid';
import type { GlobalWidgetParameters } from '../..';
import type {
  InvestigateWidget,
  InvestigateWidgetCreate,
  Investigation,
  WorkflowBlock,
} from '../../../common';
import type { WidgetDefinition } from '../../types';
import {
  InvestigateWidgetApiContextProvider,
  UseInvestigateWidgetApi,
} from '../use_investigate_widget';
import { useLocalStorage } from '../use_local_storage';
import { createNewInvestigation } from './create_new_investigation';
import {
  createInvestigationStore,
  StatefulInvestigation,
  StatefulInvestigationRevision,
} from './investigation_store';

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

export interface UseInvestigationApi {
  startNewInvestigation: (id: string) => void;
  loadInvestigation: (id: string) => void;
  investigation?: Omit<StatefulInvestigation, 'revisions'>;
  revision?: RenderableInvestigationRevision;
  isAtLatestRevision: boolean;
  isAtEarliestRevision: boolean;
  setItemPositions: (
    positions: Array<{ id: string; columns: number; rows: number }>
  ) => Promise<void>;
  setItemTitle: (id: string, title: string) => Promise<void>;
  updateItem: (
    id: string,
    cb: (item: InvestigateWidget) => Promise<InvestigateWidget>
  ) => Promise<void>;
  copyItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addItem: (options: InvestigateWidgetCreate) => Promise<void>;
  lockItem: (id: string) => Promise<void>;
  unlockItem: (id: string) => Promise<void>;
  setItemParameters: (
    id: string,
    parameters: GlobalWidgetParameters & Record<string, any>
  ) => Promise<void>;
  setGlobalParameters: (parameters: GlobalWidgetParameters) => Promise<void>;
  blocks: WorkflowBlock[];
  setRevision: (revisionId: string) => void;
  gotoPreviousRevision: () => Promise<void>;
  gotoNextRevision: () => Promise<void>;
  setTitle: (title: string) => Promise<void>;
  investigations: Investigation[];
  deleteInvestigation: (id: string) => Promise<void>;
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
  const [investigationStore, setInvestigationStore] = useState(() =>
    createInvestigationStore({
      user,
      widgetDefinitions,
      investigation: createNewInvestigation({
        user,
        id: v4(),
        globalWidgetParameters: {
          filters: [],
          timeRange: {
            from,
            to,
          },
        },
      }),
    })
  );

  const investigation$ = investigationStore.asObservable();

  const investigation = useObservable(investigation$)?.investigation;

  const currentRevision = useMemo(() => {
    return investigation?.revisions.find((revision) => revision.id === investigation.revision);
  }, [investigation?.revision, investigation?.revisions]);

  const isAtEarliestRevision = investigation?.revisions[0].id === currentRevision?.id;

  const isAtLatestRevision = last(investigation?.revisions)?.id === currentRevision?.id;

  const [blocksById, setBlocksById] = useState<Record<string, WorkflowBlock[]>>({});

  const deleteItem = useCallback(
    async (id: string) => {
      setBlocksById((prevBlocks) => omit(prevBlocks, id));
      return investigationStore.deleteItem(id);
    },
    [investigationStore]
  );

  const deleteItemRef = useRef(deleteItem);
  deleteItemRef.current = deleteItem;

  const widgetComponentsById = useRef<
    Record<string, React.ComponentType<{ widget: InvestigateWidget }>>
  >({});

  const itemsWithContext = useMemo(() => {
    const unusedComponentIds = Object.keys(widgetComponentsById);

    const nextItemsWithContext =
      currentRevision?.items.map((item) => {
        let Component = widgetComponentsById.current[item.id];
        if (!Component) {
          const id = item.id;
          const api: UseInvestigateWidgetApi = {
            onWidgetAdd: async (create) => {
              return addItemRef.current(create);
            },
            blocks: {
              publish: (nextBlocks) => {
                const nextIds = nextBlocks.map((block) => block.id);
                setBlocksById((prevBlocksById) => ({
                  ...prevBlocksById,
                  [id]: (prevBlocksById[id] ?? []).concat(nextBlocks),
                }));
                return () => {
                  setBlocksById((prevBlocksById) => ({
                    ...prevBlocksById,
                    [id]: (prevBlocksById[id] ?? []).filter((block) => !nextIds.includes(block.id)),
                  }));
                };
              },
            },
          };

          const onDelete = () => {
            return investigationStore.deleteItem(id);
          };

          const widgetDefinition = widgetDefinitions.find(
            (definition) => definition.type === item.type
          )!;

          Component = widgetComponentsById.current[id] = (props) => {
            return (
              <InvestigateWidgetApiContextProvider value={api}>
                {widgetDefinition
                  ? widgetDefinition.render({
                      blocks: api.blocks,
                      onWidgetAdd: api.onWidgetAdd,
                      onDelete,
                      widget: props.widget,
                    })
                  : undefined}
              </InvestigateWidgetApiContextProvider>
            );
          };
        }

        pull(unusedComponentIds, item.id);

        return {
          ...item,
          Component,
        };
      }) ?? [];

    unusedComponentIds.forEach((id) => {
      delete widgetComponentsById.current[id];
    });

    return nextItemsWithContext;
  }, [currentRevision?.items, widgetDefinitions, investigationStore]);

  const addItem = useCallback(
    async (widget: InvestigateWidgetCreate) => {
      try {
        const id = v4();

        setBlocksById((prevBlocksById) => ({ ...prevBlocksById, [id]: [] }));

        await investigationStore.addItem(id, widget);
      } catch (error) {
        notifications.showErrorDialog({
          title: i18n.translate('xpack.investigate.failedToAddWidget', {
            defaultMessage: 'Failed to add widget',
          }),
          error,
        });
      }
    },
    [notifications, investigationStore]
  );

  const addItemRef = useRef(addItem);
  addItemRef.current = addItem;

  const renderableRevision = useMemo(() => {
    return currentRevision
      ? {
          ...currentRevision,
          items: itemsWithContext.map((item) => {
            const { Component, ...rest } = item;
            return {
              ...rest,
              element: <Component widget={item} />,
            };
          }),
        }
      : undefined;
  }, [currentRevision, itemsWithContext]);

  const startNewInvestigation = useCallback(
    async (id: string) => {
      const prevInvestigation = await investigationStore.getInvestigation();

      const lastRevision = last(prevInvestigation.revisions)!;

      const createdInvestigationStore = createInvestigationStore({
        investigation: createNewInvestigation({
          globalWidgetParameters: lastRevision.parameters,
          user,
          id,
        }) as StatefulInvestigation,
        user,
        widgetDefinitions,
      });

      setInvestigationStore(createdInvestigationStore);

      setBlocksById({});
    },
    [user, widgetDefinitions, investigationStore]
  );

  const setItemParameters = useCallback(
    async (id: string, nextGlobalWidgetParameters: GlobalWidgetParameters) => {
      return investigationStore.setItemParameters(id, nextGlobalWidgetParameters);
    },
    [investigationStore]
  );

  const lastItemId = last(currentRevision?.items)?.id;

  const blocks = useMemo(() => {
    return lastItemId && blocksById[lastItemId] ? blocksById[lastItemId] : [];
  }, [blocksById, lastItemId]);

  const {
    copyItem,
    gotoNextRevision,
    gotoPreviousRevision,
    lockItem,
    setGlobalParameters,
    setItemPositions,
    setItemTitle,
    setRevision,
    setTitle,
    unlockItem,
    updateItem,
  } = investigationStore;

  const { storedItem: investigations, setStoredItem: setInvestigations } = useLocalStorage<
    Investigation[]
  >('experimentalInvestigations', []);

  const investigationsRef = useRef(investigations);

  investigationsRef.current = investigations;

  const loadInvestigation = useCallback(
    async (id: string) => {
      const investigationsFromStorage = investigationsRef.current;
      const nextInvestigation = investigationsFromStorage.find(
        (investigationAtIndex) => investigationAtIndex.id === id
      );

      if (!nextInvestigation) {
        throw new Error('Could not find investigation for id ' + id);
      }
      setInvestigationStore(() =>
        createInvestigationStore({
          investigation: nextInvestigation as StatefulInvestigation,
          user,
          widgetDefinitions,
        })
      );
    },
    [widgetDefinitions, user]
  );

  useEffect(() => {
    function attemptToStoreInvestigations(next: Investigation[]) {
      try {
        setInvestigations(next);
      } catch (error) {
        notifications.showErrorDialog({
          title: i18n.translate('xpack.investigate.useInvestigation.errorSavingInvestigations', {
            defaultMessage: 'Could not save investigations to local storage',
          }),
          error,
        });
      }
    }

    const subscription = investigation$.subscribe(({ investigation: investigationFromStore }) => {
      const isEmpty = investigationFromStore.revisions.length === 1;

      if (isEmpty) {
        return;
      }

      const toSerialize = {
        ...investigationFromStore,
        revisions: investigationFromStore.revisions.map((revision) => {
          return {
            ...revision,
            items: revision.items.map((item) => {
              const { loading, ...rest } = item;
              return rest;
            }),
          };
        }),
      };

      const hasStoredCurrentInvestigation = !!investigationsRef.current.find(
        (investigationAtIndex) => investigationAtIndex.id === investigationFromStore.id
      );

      if (!hasStoredCurrentInvestigation) {
        attemptToStoreInvestigations([...(investigationsRef.current ?? []), toSerialize].reverse());
        return;
      }

      const nextInvestigations = investigationsRef.current
        .map((investigationAtIndex) => {
          if (investigationAtIndex.id === investigationFromStore.id) {
            return toSerialize;
          }
          return investigationAtIndex;
        })
        .reverse();

      attemptToStoreInvestigations(nextInvestigations);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [investigation$, setInvestigations, notifications]);

  const deleteInvestigation = useCallback(
    async (id: string) => {
      const nextInvestigations = investigationsRef.current.filter(
        (investigationAtIndex) => investigationAtIndex.id !== id
      );
      setInvestigations(nextInvestigations);
      if (investigation?.id === id) {
        const nextInvestigation = nextInvestigations[0];

        if (nextInvestigation) {
          loadInvestigation(nextInvestigation.id);
        } else {
          startNewInvestigation(v4());
        }
      }
    },
    [loadInvestigation, startNewInvestigation, setInvestigations, investigation?.id]
  );

  return {
    addItem,
    blocks,
    copyItem,
    deleteItem,
    gotoNextRevision,
    gotoPreviousRevision,
    investigation,
    isAtEarliestRevision,
    isAtLatestRevision,
    loadInvestigation,
    lockItem,
    revision: renderableRevision,
    setGlobalParameters,
    setItemParameters,
    setItemPositions,
    setItemTitle,
    setRevision,
    setTitle,
    startNewInvestigation,
    unlockItem,
    updateItem,
    investigations,
    deleteInvestigation,
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
