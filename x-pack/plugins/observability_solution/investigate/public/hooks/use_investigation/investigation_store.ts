/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { MaybePromise } from '@kbn/utility-types';
import { BehaviorSubject, Observable } from 'rxjs';
import { v4 } from 'uuid';
import { InvestigateWidget, mergePlainObjects } from '../../../common';
import {
  GlobalWidgetParameters,
  InvestigateWidgetCreate,
  Investigation,
} from '../../../common/types';
import { WidgetDefinition } from '../../types';

export type StatefulInvestigateWidget = InvestigateWidget & {
  loading: boolean;
};

export type StatefulInvestigation = Omit<Investigation, 'items'> & {
  items: StatefulInvestigateWidget[];
};

interface InvestigationStore {
  copyItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addItem: (id: string, item: InvestigateWidgetCreate) => Promise<void>;
  asObservable: () => Observable<{
    investigation: StatefulInvestigation;
  }>;
  getInvestigation: () => Promise<Readonly<StatefulInvestigation>>;
  setGlobalParameters: (globalWidgetParameters: GlobalWidgetParameters) => Promise<void>;
  setTitle: (title: string) => Promise<void>;
  destroy: () => void;
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

  const nextParameters = mergePlainObjects(widget.parameters, globalWidgetParameters);

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

export function createInvestigationStore({
  investigation,
  user,
  widgetDefinitions,
}: {
  investigation: Investigation;
  user: AuthenticatedUser;
  widgetDefinitions: WidgetDefinition[];
}): InvestigationStore {
  const controller = new AbortController();

  const observable$ = new BehaviorSubject<{ investigation: StatefulInvestigation }>({
    investigation: {
      ...investigation,
      items: investigation.items.map((item) => ({ ...item, loading: false })),
    },
  });

  async function updateInvestigationInPlace(
    cb: (prevInvestigation: StatefulInvestigation) => MaybePromise<StatefulInvestigation>
  ) {
    observable$.next({ investigation: await cb(observable$.value.investigation) });
  }

  const asObservable = observable$.asObservable();

  return {
    addItem: (itemId, item) => {
      return updateInvestigationInPlace(async (prevInvestigation) => {
        return {
          ...prevInvestigation,
          items: prevInvestigation.items.concat({
            ...(await regenerateItem({
              user,
              widgetDefinitions,
              signal: controller.signal,
              widget: {
                ...item,
                id: itemId,
              },
              globalWidgetParameters: prevInvestigation.parameters,
            })),
            loading: false,
          }),
        };
      });
    },
    copyItem: (itemId) => {
      return updateInvestigationInPlace((prevInvestigation) => {
        const itemToCopy = prevInvestigation.items.find((item) => item.id === itemId);
        if (!itemToCopy) {
          throw new Error('Cannot find item for id ' + itemId);
        }
        return {
          ...prevInvestigation,
          items: prevInvestigation.items.concat({
            ...itemToCopy,
            id: v4(),
          }),
        };
      });
    },
    deleteItem: (itemId) => {
      return updateInvestigationInPlace((prevInvestigation) => {
        const itemToDelete = prevInvestigation.items.find((item) => item.id === itemId);
        if (!itemToDelete) {
          return prevInvestigation;
        }

        return {
          ...prevInvestigation,
          items: prevInvestigation.items.filter(
            (itemAtIndex) => itemAtIndex.id !== itemToDelete.id
          ),
        };
      });
    },
    asObservable: () => asObservable,
    getInvestigation: async () => Object.freeze(observable$.value.investigation),
    destroy: () => {
      return controller.abort();
    },
    setGlobalParameters: async (parameters) => {
      await updateInvestigationInPlace((prevInvestigation) => {
        return {
          ...prevInvestigation,
          items: prevInvestigation.items.map((item) => {
            return { ...item, loading: true };
          }),
        };
      });

      await updateInvestigationInPlace(async (prevInvestigation) => {
        return {
          ...prevInvestigation,
          parameters,
          items: await Promise.all(
            prevInvestigation.items.map(async (item) => {
              return {
                ...(await regenerateItem({
                  widget: item,
                  globalWidgetParameters: parameters,
                  signal: controller.signal,
                  user,
                  widgetDefinitions,
                })),
                loading: false,
              };
            })
          ),
        };
      });
    },
    setTitle: async (title: string) => {
      return updateInvestigationInPlace((prevInvestigation) => {
        return { ...prevInvestigation, title };
      });
    },
  };
}
