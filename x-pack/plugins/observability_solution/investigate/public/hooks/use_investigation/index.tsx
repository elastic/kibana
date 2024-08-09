/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AuthenticatedUser, NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { pull } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { v4 } from 'uuid';
import type { GlobalWidgetParameters } from '../..';
import type { InvestigateWidget, InvestigateWidgetCreate, Investigation } from '../../../common';
import type { WidgetDefinition } from '../../types';
import {
  InvestigateWidgetApiContextProvider,
  UseInvestigateWidgetApi,
} from '../use_investigate_widget';
import { useLocalStorage } from '../use_local_storage';
import { createNewInvestigation } from './create_new_investigation';
import { StatefulInvestigation, createInvestigationStore } from './investigation_store';

export type RenderableInvestigateWidget = InvestigateWidget & {
  loading: boolean;
  element: React.ReactNode;
};

export type RenderableInvestigation = Omit<StatefulInvestigation, 'items'> & {
  items: RenderableInvestigateWidget[];
};

export interface UseInvestigationApi {
  startNewInvestigation: (id: string) => void;
  loadInvestigation: (id: string) => void;
  investigations: Investigation[];
  investigation?: StatefulInvestigation;
  renderableInvestigation?: RenderableInvestigation;
  copyItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addItem: (options: InvestigateWidgetCreate) => Promise<void>;
  setGlobalParameters: (parameters: GlobalWidgetParameters) => Promise<void>;
  setTitle: (title: string) => Promise<void>;
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

  const deleteItem = useCallback(
    async (id: string) => {
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
      investigation?.items.map((item) => {
        let Component = widgetComponentsById.current[item.id];
        if (!Component) {
          const id = item.id;
          const api: UseInvestigateWidgetApi = {
            onWidgetAdd: async (create) => {
              return addItemRef.current(create);
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
  }, [investigation?.items, widgetDefinitions, investigationStore]);

  const addItem = useCallback(
    async (widget: InvestigateWidgetCreate) => {
      try {
        const id = v4();

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

  const renderableInvestigation = useMemo(() => {
    return investigation
      ? {
          ...investigation,
          items: itemsWithContext.map((item) => {
            const { Component, ...rest } = item;
            return {
              ...rest,
              element: <Component widget={item} />,
            };
          }),
        }
      : undefined;
  }, [investigation, itemsWithContext]);

  const startNewInvestigation = useCallback(
    async (id: string) => {
      const prevInvestigation = await investigationStore.getInvestigation();

      const createdInvestigationStore = createInvestigationStore({
        investigation: createNewInvestigation({
          globalWidgetParameters: prevInvestigation.parameters,
          user,
          id,
        }) as StatefulInvestigation,
        user,
        widgetDefinitions,
      });

      setInvestigationStore(createdInvestigationStore);
    },
    [user, widgetDefinitions, investigationStore]
  );

  const { copyItem, setGlobalParameters, setTitle } = investigationStore;

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
      const isEmpty = investigationFromStore.items.length === 0;

      if (isEmpty) {
        return;
      }

      const toSerialize = {
        ...investigationFromStore,
        items: investigationFromStore.items.map((item) => {
          const { loading, ...rest } = item;
          return rest;
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
    copyItem,
    deleteItem,
    investigation,
    loadInvestigation,
    renderableInvestigation,
    setGlobalParameters,
    setTitle,
    startNewInvestigation,
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
