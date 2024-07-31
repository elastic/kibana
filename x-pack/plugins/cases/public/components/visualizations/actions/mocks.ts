/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBrowserHistory } from 'history';
import { BehaviorSubject } from 'rxjs';

import type { PublicAppInfo } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { LensApi, LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { Services } from './types';

const coreStart = coreMock.createStart();

export const mockLensAttributes = {
  title: 'mockTitle',
  description: 'mockDescription',
  references: [],
  state: {
    visualization: {
      id: 'mockId',
      type: 'mockType',
      title: 'mockTitle',
      visualizationType: 'mockVisualizationType',
      references: [],
      state: {
        datasourceStates: {
          indexpattern: {},
        },
      },
    },
  },
} as unknown as LensSavedObjectAttributes;

export const getMockLensApi = (
  { from, to = 'now' }: { from: string; to: string } = { from: 'now-24h', to: 'now' }
): LensApi =>
  ({
    type: 'lens',
    getSavedVis: () => {},
    canViewUnderlyingData: () => {},
    getViewUnderlyingDataArgs: () => {},
    getFullAttributes: () => {
      return mockLensAttributes;
    },
    panelTitle: new BehaviorSubject('myPanel'),
    hidePanelTitle: new BehaviorSubject('false'),
    timeslice$: new BehaviorSubject<[number, number] | undefined>(undefined),
    timeRange$: new BehaviorSubject<TimeRange | undefined>({
      from,
      to,
    }),
    filters$: new BehaviorSubject<Filter[] | undefined>(undefined),
    query$: new BehaviorSubject<Query | AggregateQuery | undefined>(undefined),
  } as unknown as LensApi);

export const getMockCurrentAppId$ = () => new BehaviorSubject<string>('securitySolutionUI');
export const getMockApplications$ = () =>
  new BehaviorSubject<Map<string, PublicAppInfo>>(
    new Map([['securitySolutionUI', { category: { label: 'Test' } } as unknown as PublicAppInfo]])
  );

export const getMockServices = () => {
  return {
    core: {
      ...coreStart,
      application: { currentAppId$: getMockCurrentAppId$(), capabilities: {} },
      uiSettings: {
        get: jest.fn().mockReturnValue(true),
      },
    },
    plugins: {},
    storage: {},
    history: createBrowserHistory(),
  } as unknown as Services;
};
