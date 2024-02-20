/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actions, createMachine, InterpreterFrom } from 'xstate';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { MatchedStateFromActor } from '../../../../observability_logs/xstate_helpers';
import { InventoryViewsServiceStart } from '../../../../services/inventory_views';
import {
  initializeFromUrl,
  updateContextInUrl,
  initializeSavedViewIdFromUrl,
} from './url_state_storage_service';
import { initializeFromSavedViewService } from './saved_view_service';
import type {
  InventoryPageContext,
  InventoryPageContextWithTime,
  InventoryPageContextWithOptions,
  InventoryPageContextWithFilter,
  InventoryPageEvent,
  InventoryPageTypestate,
  InventoryPageContextWithSavedView,
} from './types';

export interface InventoryPageQueryStateMachineDependencies {
  urlStateStorage: IKbnUrlStateStorage;
  inventoryViewsService: InventoryViewsServiceStart;
}

export const createPureInventoryPageStateMachine = (initialContext: InventoryPageContext) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBsD2UDKAXATmAhgLYAK+M2+WYAdAK4B2Alk1o-sowF6QDEAMgHkAggBEAkgDkA4gH1BsgGpiAogHUZGACpCASpuUiA2gAYAuolAAHVLEatU9CyAAeiALQAmAJzUPHgGwArIEALAAcHmHhXsEhADQgAJ6IAQDM1IHGYQDs2ZnZxl5e-l6pAL5lCWiYuAQkZGAUVHRMLGwc3BD8wuLScgKKKuoAYkJifAYm5kgg1rb2jjOuCJ4hAIzUqZklHgX+xqlrkQnJCKlB1P4loYH+qV7hHoEVVejYeESk5FiUNAzMdnaXF4glEklk8hkSjUGgAqgBheHKAyTMxOOaAhxOZbZNbZajGXLBVIkrJrYInRBHYzUEIeVIhVJhNZZLws7IhF4garvOpfRo-Zr-NrsYFdUG9CEDKFDOGI5EiSZraZWGyYxagHEhEIEwkeI7Zc7GO6UhCZHzZML7MKBDwhQp0zmVblvWqfBpNGhofAQZhQPjoBSMMAAd26YL6kOhIzGEyMaJmGIW2JS4VpJTCWXp5K82Q8pvN1Et1tt9oedq5PLd9W+v2o3t99H9geDYYl4P6gxhGARSJR8ZVszVyaWiEZPnt-m8Ry8xjta38pqN1FK+uy+w8xhCgS8lddHxrArrDb9AagQdD4clnZl3d7CqVg6TjCxo4QISumy2MWNMWiAVNO58WMFkImMOc50CMI9xqA9+U9etUB9U8W1DYZ8EYZAQR6Dso1lLRdH0Ad0WHF8NRcdxvF8AJYgiKIwhiUIC1SDwMgNcC8g5O1nmdKs4I9QUaAAC3wWAzwvEMxHoX0AGM4GoAFWFFTg-QARVoMAcESHgdGUJExAUAwZEkMRNDEIQ+BkVTYWUHQAE0ZGIXQhAAWWUfQdAwKYSPmMinFOKcNgKXYwnOPMbRYhJlhCYoYN5d1a2aESxNQyTpMYOTYAUkUOjUjStJ4BQLLEEQrJs+yZHhAAJIRpFRJ9SNfTUx2KAtDSLOdLTCyJAhYuLq3gwTqGS8TWyk2T5MUoEVKbdTNO0yQir4EqytshzqtqqR6p89UU3fVqkkQS1WNKXEoP8cLeo8fr+MS4TRNG0Nxoyyacq4PL5p4My3Mqmq6uIxNGvI6KDtOW1Ag6kLuoi67eP3PkBLrEbUuezLssBZS-WIIHYB0vTlAMoyTLMizHIEDBTLEAQJEc5y3I8ryE1VXymoo-bF0OhAGI2EDbVCi6er6uHYIRu7hoelH0rRqbMabbGWfoXHiHJynqYwX7Nu2wGFb2mKOdOIofEKBksgFmGbtFo8kol88xql16MY6XglpW6y1o1-7vO13a3wXPJaTWCJbSne0SQLOcV3XJ5t0yXq1jWC2Eqt+6Uttp77aymWna6b7lA9raAeZn3moQBdCV8b99hiQ0rnzTntx1XMpxuWPDgT4X4sPBDkbTtKJszt7Oh4ZWKbMtX861ouRxLsv8XpHcq8CGup0A+OCVCVJskY4w49h14RaT7ubYk1GHaU7OeAAKVhFziBkTQBHv3Qts0MnR6piQvanvzff2OfK8KEvc4K967Gkjs3GOO826Jy7kNHuJ8M7o3PmKPGys9AygpgAIQmG-VWEhGYNR1r-cu89iiAOXnXU4WwwjgOjsEKB8cYGDSRsfO2-ckHTV4LCYgIghD6HvmIH6OhNZfyHEQmef8K4L3IcAyhR01g+DWCxTIkDd5MMRtbVOCD2FZxQdw3h-DdLDF0hgKqxkJAeSWqI58rNlizykWQ6usilwsloS3Bh7d96d2YZox6fcXoD0digpyW0ZDKAkKVTBsJhjDFsjIXSQhqqTzEcXNm9jSGLwoaaAIJ0o7uLju3Z09BUAQDgE4PiltPQ7WnmzTwDFNjbC8LsY0BwlGmjcCxAk9IOSZgXDuUotx1Fi2FEEzo1Sf4lzpKaNYdJqDknAlkG0bIghbiGcnRCyEmx+PGbYlI+JYhXCtDaXIP54icyZDQ+4-gjgCy2H4HiXiBoaK9EhRszZe7oUwpAHZwNEAQ2ZHaJpdwLpsiWYBHcRZN72njlubw0EO5PLFvAthASfl7TcOEaZEcQhR3WDaGKXVPEugPrAlhWiUXS0Hh9LSaK3zGEAvqSGXUzZXTWUfcl6cdFUrljjWlJd6WcwiKxTcUMWVC0ebddZyLOUBI4cpb53sal2KZDqPI5IllANrgWJ4TL+aXXFcS7xzzqCEEYLAWwWzJb9z5Wkw4-hfCFD8NvG0F1wUWk3pvXEXqDjlAqGUIAA */
  createMachine<InventoryPageContext, InventoryPageEvent, InventoryPageTypestate>(
    {
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'inventoryPageState',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: {
            target: 'initializingFromSavedView',
          },
        },
        initializingFromSavedView: {
          on: {
            INITIALIZED_SAVED_VIEW_ID_FROM_URL: {
              target: 'loadSavedView',
              actions: ['storeSavedViewId'],
            },
          },
          invoke: {
            src: 'initializeSavedViewIdFromUrl',
          },
        },
        loadSavedView: {
          on: {
            INITIALIZED_FROM_SAVED_VIEW_SERVICE: {
              target: 'initializingFromUrl',
              actions: ['storeTime', 'storeOptions', 'storeFilter', 'storeSavedViewName'],
            },
          },
          invoke: {
            src: 'initializeFromSavedViewService',
          },
        },
        initializingFromUrl: {
          on: {
            INITIALIZED_FROM_URL: {
              target: 'initialized',
              actions: ['storeTime', 'storeOptions', 'storeFilter'],
            },
          },
          invoke: {
            src: 'initializeFromUrl',
          },
        },
        initialized: {
          on: {
            TIME_CHANGED: {
              target: 'initialized',
              internal: true,
              actions: ['storeTime', 'updateContextInUrl'],
            },
            OPTIONS_CHANGED: {
              target: 'initialized',
              internal: true,
              actions: ['storeOptions', 'updateContextInUrl'],
            },
            FILTER_CHANGED: {
              target: 'initialized',
              internal: true,
              actions: ['storeFilter', 'updateContextInUrl'],
            },
          },
        },
      },
    },
    {
      actions: {
        storeSavedViewId: actions.assign((_context, event) => {
          return 'savedViewId' in event
            ? ({ savedViewId: event.savedViewId } as InventoryPageContextWithSavedView)
            : { savedViewId: '0' };
        }),
        storeSavedViewName: actions.assign((_context, event) => {
          return 'savedViewName' in event
            ? ({ savedViewName: event.savedViewName } as InventoryPageContextWithSavedView)
            : {};
        }),
        storeFilter: actions.assign((context, event) => {
          return 'filter' in event
            ? ({ filter: { ...context.filter, ...event.filter } } as InventoryPageContextWithFilter)
            : {};
        }),
        storeOptions: actions.assign((context, event) => {
          return 'options' in event
            ? ({
                options: { ...context.options, ...event.options },
              } as InventoryPageContextWithOptions)
            : {};
        }),
        storeTime: actions.assign((context, event) => {
          return 'time' in event
            ? ({ time: { ...context.time, ...event.time } } as InventoryPageContextWithTime)
            : {};
        }),
      },
    }
  );

export type InventoryPageStateMachine = InterpreterFrom<typeof createInventoryPageStateMachine>;
export type InventoryPageStateMachineDependencies = InventoryPageQueryStateMachineDependencies;

export type InitializedInventoryPageState = MatchedStateFromActor<
  InventoryPageStateMachine,
  'initialized'
>;

export const createInventoryPageStateMachine = (
  initialContext: InventoryPageContext,
  { inventoryViewsService, urlStateStorage }: InventoryPageStateMachineDependencies
) =>
  createPureInventoryPageStateMachine(initialContext).withConfig({
    actions: {
      updateContextInUrl: updateContextInUrl({ urlStateStorage }),
    },
    services: {
      initializeSavedViewIdFromUrl: initializeSavedViewIdFromUrl({ urlStateStorage }),
      initializeFromUrl: initializeFromUrl({ urlStateStorage }),
      initializeFromSavedViewService: initializeFromSavedViewService({
        inventoryViewsService,
      }),
    },
  });
