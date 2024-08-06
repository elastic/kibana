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
  InvestigationRevision,
} from '../../../common/types';
import { WidgetDefinition } from '../../types';

export type StatefulInvestigateWidget = InvestigateWidget & {
  loading: boolean;
};

export type StatefulInvestigation = Omit<Investigation, 'revisions'> & {
  revisions: StatefulInvestigationRevision[];
};

export type StatefulInvestigationRevision = Omit<InvestigationRevision, 'items'> & {
  items: StatefulInvestigateWidget[];
};

interface InvestigationStore {
  copyItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addItem: (id: string, item: InvestigateWidgetCreate) => Promise<void>;
  setItemTitle: (id: string, title: string) => Promise<void>;
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
      revisions: investigation.revisions.map((revision) => {
        return {
          ...revision,
          items: revision.items.map((item) => ({ ...item, loading: false })),
        };
      }),
    },
  });

  async function updateInvestigationInPlace(
    cb: (prevInvestigation: StatefulInvestigation) => MaybePromise<StatefulInvestigation>
  ) {
    observable$.next({ investigation: await cb(observable$.value.investigation) });
  }

  async function updateRevisionInPlace(
    cb: (prevRevision: StatefulInvestigationRevision) => MaybePromise<StatefulInvestigationRevision>
  ) {
    return updateInvestigationInPlace(async (prevInvestigation) => {
      const currentRevision = prevInvestigation.revisions.find((revision) => {
        return revision.id === prevInvestigation.revision;
      })!;

      const newRevision = await cb(currentRevision);

      return {
        ...prevInvestigation,
        revisions: prevInvestigation.revisions.map((revision) => {
          return revision.id === currentRevision.id ? newRevision : revision;
        }),
      };
    });
  }

  async function nextRevision(
    cb: (prevRevision: StatefulInvestigationRevision) => MaybePromise<StatefulInvestigationRevision>
  ) {
    return updateInvestigationInPlace(async (prevInvestigation) => {
      const indexOfCurrentRevision = prevInvestigation.revisions.findIndex(
        (revision) => revision.id === prevInvestigation.revision
      );

      const currentRevision = prevInvestigation.revisions[indexOfCurrentRevision];

      const newRevision = {
        ...(await cb(currentRevision)),
        id: v4(),
      };

      return {
        ...prevInvestigation,
        revisions: prevInvestigation.revisions
          .slice(0, indexOfCurrentRevision + 1)
          .concat(newRevision)
          .slice(-10),
        revision: newRevision.id,
      };
    });
  }

  async function updateItem(
    itemId: string,
    cb: (prevItem: InvestigateWidget) => MaybePromise<InvestigateWidget>
  ) {
    await updateRevisionInPlace(async (prevRevision) => {
      const prevItem = prevRevision.items.find((item) => item.id === itemId);
      if (!prevItem) {
        throw new Error('Could not find item by id ' + itemId);
      }
      return {
        ...prevRevision,
        items: prevRevision.items.map((item) => {
          if (item === prevItem) {
            return { ...prevItem, loading: true };
          }
          return item;
        }),
      };
    });

    await nextRevision(async (prevRevision) => {
      const prevItem = prevRevision.items.find((item) => item.id === itemId);
      if (!prevItem) {
        throw new Error('Could not find item by id ' + itemId);
      }
      const nextItem = await cb(prevItem);
      return {
        ...prevRevision,
        items: prevRevision.items.map((item) => {
          if (item === prevItem) {
            return { ...nextItem, loading: false };
          }
          return item;
        }),
      };
    });
  }

  const asObservable = observable$.asObservable();

  return {
    addItem: (itemId, item) => {
      return nextRevision(async (prevRevision) => {
        return {
          ...prevRevision,
          items: prevRevision.items.concat({
            ...(await regenerateItem({
              user,
              widgetDefinitions,
              signal: controller.signal,
              widget: {
                ...item,
                id: itemId,
              },
              globalWidgetParameters: prevRevision.parameters,
            })),
            loading: false,
          }),
        };
      });
    },
    copyItem: (itemId) => {
      return nextRevision((prevRevision) => {
        const itemToCopy = prevRevision.items.find((item) => item.id === itemId);
        if (!itemToCopy) {
          throw new Error('Cannot find item for id ' + itemId);
        }
        return {
          ...prevRevision,
          items: prevRevision.items.concat({
            ...itemToCopy,
            id: v4(),
          }),
        };
      });
    },
    deleteItem: (itemId) => {
      return nextRevision((prevRevision) => {
        const itemToDelete = prevRevision.items.find((item) => item.id === itemId);
        if (!itemToDelete) {
          return prevRevision;
        }
        return {
          ...prevRevision,
          items: prevRevision.items.filter((itemAtIndex) => itemAtIndex.id !== itemToDelete.id),
        };
      });
    },
    asObservable: () => asObservable,
    getInvestigation: async () => Object.freeze(observable$.value.investigation),
    destroy: () => {
      return controller.abort();
    },
    setGlobalParameters: async (parameters) => {
      await updateRevisionInPlace((prevRevision) => {
        return {
          ...prevRevision,
          items: prevRevision.items.map((item) => {
            return { ...item, loading: true };
          }),
        };
      });

      await nextRevision(async (prevRevision) => {
        return {
          ...prevRevision,
          parameters,
          items: await Promise.all(
            prevRevision.items.map(async (item) => {
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
    setItemTitle: async (itemId, title) => {
      return updateItem(itemId, (prev) => ({ ...prev, title }));
    },
    setTitle: async (title: string) => {
      return nextRevision((prevRevision) => {
        return { ...prevRevision, title };
      });
    },
  };
}
