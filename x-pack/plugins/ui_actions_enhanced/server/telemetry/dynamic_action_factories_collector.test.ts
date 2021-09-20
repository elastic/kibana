/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { dynamicActionFactoriesCollector } from './dynamic_action_factories_collector';
import { DynamicActionsState } from '../../common';
import { ActionFactory } from '../types';

type GetActionFactory = (id: string) => undefined | ActionFactory;

const factories: Record<string, ActionFactory> = {
  FACTORY_ID_1: {
    id: 'FACTORY_ID_1',
    telemetry: jest.fn((state: DynamicActionsState, stats: Record<string, number>) => {
      stats.myStat_1 = 1;
      stats.myStat_2 = 123;
      return stats;
    }),
  } as unknown as ActionFactory,
  FACTORY_ID_2: {
    id: 'FACTORY_ID_2',
    telemetry: jest.fn((state: DynamicActionsState, stats: Record<string, number>) => stats),
  } as unknown as ActionFactory,
  FACTORY_ID_3: {
    id: 'FACTORY_ID_3',
    telemetry: jest.fn((state: DynamicActionsState, stats: Record<string, number | string>) => {
      stats.myStat_1 = 2;
      stats.stringStat = 'abc';
      return stats;
    }),
  } as unknown as ActionFactory,
};

const getActionFactory: GetActionFactory = (id: string) => factories[id];

const state: DynamicActionsState = {
  events: [
    {
      eventId: 'eventId-1',
      triggers: ['TRIGGER_1'],
      action: {
        factoryId: 'FACTORY_ID_1',
        name: 'Click me!',
        config: {},
      },
    },
    {
      eventId: 'eventId-2',
      triggers: ['TRIGGER_2', 'TRIGGER_3'],
      action: {
        factoryId: 'FACTORY_ID_2',
        name: 'Click me, too!',
        config: {
          doCleanup: true,
        },
      },
    },
    {
      eventId: 'eventId-3',
      triggers: ['TRIGGER_4', 'TRIGGER_1'],
      action: {
        factoryId: 'FACTORY_ID_3',
        name: 'Go to documentation',
        config: {
          url: 'http://google.com',
          iamFeelingLucky: true,
        },
      },
    },
  ],
};

beforeEach(() => {
  Object.values(factories).forEach((factory) => {
    (factory.telemetry as unknown as jest.SpyInstance).mockClear();
  });
});

describe('dynamicActionFactoriesCollector', () => {
  test('returns empty stats when there are not dynamic actions', () => {
    const stats = dynamicActionFactoriesCollector(
      getActionFactory,
      {
        events: [],
      },
      {}
    );

    expect(stats).toEqual({});
  });

  test('calls .telemetry() method of a supplied factory', () => {
    const currentState = {
      events: [state.events[0]],
    };
    dynamicActionFactoriesCollector(getActionFactory, currentState, {});

    const spy1 = factories.FACTORY_ID_1.telemetry as unknown as jest.SpyInstance;
    const spy2 = factories.FACTORY_ID_2.telemetry as unknown as jest.SpyInstance;

    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(0);

    expect(spy1.mock.calls[0][0]).toEqual(currentState.events[0]);
    expect(typeof spy1.mock.calls[0][1]).toBe('object');
    expect(!!spy1.mock.calls[0][1]).toBe(true);
  });

  test('returns stats received from factory', () => {
    const currentState = {
      events: [state.events[0]],
    };
    const stats = dynamicActionFactoriesCollector(getActionFactory, currentState, {});

    expect(stats).toEqual({
      myStat_1: 1,
      myStat_2: 123,
    });
  });
});
