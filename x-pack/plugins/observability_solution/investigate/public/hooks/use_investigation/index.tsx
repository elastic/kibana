/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AuthenticatedUser, NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { GetInvestigationResponse } from '@kbn/investigation-shared';
import { pull } from 'lodash';
import React, { useMemo, useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { v4 } from 'uuid';
import type { GlobalWidgetParameters } from '../..';
import type { InvestigateWidget, InvestigateWidgetCreate } from '../../../common';
import type { WidgetDefinition } from '../../types';
import { createNewInvestigation, fromInvestigationResponse } from './create_new_investigation';
import { StatefulInvestigation, createInvestigationStore } from './investigation_store';

export type RenderableInvestigateWidget = InvestigateWidget & {
  loading: boolean;
  element: React.ReactNode;
};

export type RenderableInvestigation = Omit<StatefulInvestigation, 'items'> & {
  items: RenderableInvestigateWidget[];
};

export interface UseInvestigationApi {
  investigation?: StatefulInvestigation;
  renderableInvestigation?: RenderableInvestigation;
  copyItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addItem: (options: InvestigateWidgetCreate) => Promise<void>;
  setGlobalParameters: (parameters: GlobalWidgetParameters) => Promise<void>;
  setTitle: (title: string) => Promise<void>;
}

function useInvestigationWithoutContext({
  user,
  notifications,
  widgetDefinitions,
  investigationData,
}: {
  user: AuthenticatedUser;
  notifications: NotificationsStart;
  widgetDefinitions: WidgetDefinition[];
  investigationData?: GetInvestigationResponse;
}): UseInvestigationApi {
  const [investigationStore, _] = useState(() =>
    createInvestigationStore({
      user,
      widgetDefinitions,
      investigation: investigationData
        ? fromInvestigationResponse(investigationData)
        : createNewInvestigation(),
    })
  );

  const investigation$ = investigationStore.asObservable();
  const investigation = useObservable(investigation$)?.investigation;

  const addItem = async (widget: InvestigateWidgetCreate) => {
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
  };

  const deleteItem = async (id: string) => {
    return investigationStore.deleteItem(id);
  };

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
          const widgetDefinition = widgetDefinitions.find(
            (definition) => definition.type === item.type
          )!;

          Component = widgetComponentsById.current[id] = (props) => {
            return <>{widgetDefinition?.render({ widget: props.widget })}</>;
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
  }, [investigation?.items, widgetDefinitions]);

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

  const { copyItem, setGlobalParameters, setTitle } = investigationStore;

  return {
    addItem,
    copyItem,
    deleteItem,
    investigation,
    renderableInvestigation,
    setGlobalParameters,
    setTitle,
  };
}

export function createUseInvestigation({
  notifications,
  widgetDefinitions,
}: {
  notifications: NotificationsStart;
  widgetDefinitions: WidgetDefinition[];
}) {
  return ({
    user,
    investigationData,
  }: {
    user: AuthenticatedUser;
    investigationData?: GetInvestigationResponse;
  }) => {
    return useInvestigationWithoutContext({
      user,
      notifications,
      widgetDefinitions,
      investigationData,
    });
  };
}
