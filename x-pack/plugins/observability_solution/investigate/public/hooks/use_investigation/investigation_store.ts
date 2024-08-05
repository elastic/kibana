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
  updateItem: (
    id: string,
    cb: (prevItem: InvestigateWidget) => Promise<InvestigateWidget>
  ) => Promise<void>;
  lockItem: (id: string) => Promise<void>;
  unlockItem: (id: string) => Promise<void>;
  setItemTitle: (id: string, title: string) => Promise<void>;
  getInvestigation: () => Promise<Readonly<StatefulInvestigation>>;
  setGlobalParameters: (globalWidgetParameters: GlobalWidgetParameters) => Promise<void>;
  setItemParameters: (id: string, parameters: GlobalWidgetParameters) => Promise<void>;
  setTitle: (title: string) => Promise<void>;
  destroy: () => void;
  asObservable: () => Observable<{
    investigation: StatefulInvestigation;
  }>;
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
    id: v4(),
    created: now,
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

  async function updateStoredItem(
    itemId: string,
    cb: (prevItem: InvestigateWidget) => MaybePromise<InvestigateWidget>
  ) {
    await updateInvestigationInPlace(async (prevInvestigation) => {
      const prevItem = prevInvestigation.items.find((item) => item.id === itemId);
      if (!prevItem) {
        throw new Error('Could not find item by id ' + itemId);
      }
      const nextItem = await cb(prevItem);

      return {
        ...prevInvestigation,
        items: prevInvestigation.items.map((item) => {
          if (item.id === itemId) {
            return { ...nextItem, loading: false };
          }
          return item;
        }),
      };
    });
  }

  async function regenerateItemAndUpdateInvestigation(
    itemId: string,
    partials: Partial<InvestigateWidget>
  ) {
    await updateInvestigationInPlace(async (prevInvestigation) => {
      const prevItem = prevInvestigation.items.find((item) => item.id === itemId);
      if (!prevItem) {
        throw new Error('Could not find item by id ' + itemId);
      }

      const newItem = await regenerateItem({
        user,
        widgetDefinitions,
        signal: controller.signal,
        widget: {
          ...prevItem,
          ...partials,
          id: itemId,
        },
        globalWidgetParameters: prevInvestigation.parameters,
      });

      return {
        ...prevInvestigation,
        items: prevInvestigation.items.map((item) => {
          if (item.id === itemId) {
            return { ...newItem, loading: false };
          }
          return item;
        }),
      };
    });
  }

  return {
    asObservable: () => observable$.asObservable(),
    addItem: async (itemId, item) => {
      await updateInvestigationInPlace(async (prevInvestigation) => {
        const newItem = await regenerateItem({
          user,
          widgetDefinitions,
          signal: controller.signal,
          widget: {
            ...item,
            id: itemId,
          },
          globalWidgetParameters: prevInvestigation.parameters,
        });

        prevInvestigation.items.push({
          ...newItem,
          loading: false,
        });

        return prevInvestigation;
      });
    },
    updateItem: async (itemId, cb) => {
      return updateStoredItem(itemId, cb);
    },
    copyItem: async (itemId) => {
      await updateInvestigationInPlace(async (prevInvestigation) => {
        const itemToCopy = prevInvestigation.items.find((item) => item.id === itemId);
        if (!itemToCopy) {
          throw new Error('Cannot find item for id ' + itemId);
        }

        prevInvestigation.items.push({
          ...itemToCopy,
          id: v4(),
        });

        return prevInvestigation;
      });
    },
    deleteItem: async (itemId) => {
      await updateInvestigationInPlace(async (prevInvestigation) => {
        const itemToDelete = prevInvestigation.items.find((item) => item.id === itemId);
        if (!itemToDelete) {
          throw new Error('Cannot find item for id ' + itemId);
        }

        return {
          ...prevInvestigation,
          items: prevInvestigation.items.filter((item) => item.id !== itemToDelete.id),
        };
      });
    },
    getInvestigation: async () => Object.freeze(observable$.value.investigation),
    destroy: () => {
      return controller.abort();
    },
    setGlobalParameters: async (parameters) => {
      await updateInvestigationInPlace(async (prevInvestigation) => {
        return {
          ...prevInvestigation,
          parameters,
          items: await Promise.all(
            prevInvestigation.items.map(async (item) => {
              return item.locked
                ? item
                : {
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
    setItemTitle: async (itemId, title) => {
      return updateStoredItem(itemId, (prev) => ({ ...prev, title }));
    },
    lockItem: async (itemId) => {
      await regenerateItemAndUpdateInvestigation(itemId, { locked: true });
    },
    unlockItem: async (itemId) => {
      await regenerateItemAndUpdateInvestigation(itemId, { locked: false });
    },
    setTitle: async (title: string) => {
      return updateInvestigationInPlace((prevInvestigation) => ({ ...prevInvestigation, title }));
    },
    setItemParameters: async (itemId, nextParameters) => {
      await regenerateItemAndUpdateInvestigation(itemId, { parameters: nextParameters });
    },
  };
}
