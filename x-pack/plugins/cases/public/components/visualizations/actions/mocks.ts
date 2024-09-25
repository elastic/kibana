/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBrowserHistory } from 'history';
import { BehaviorSubject } from 'rxjs';

import type { DataView } from '@kbn/data-views-plugin/common';
import type { PublicAppInfo } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { LensApi, LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { PhaseEvent } from '@kbn/presentation-publishing';
import type { Adapters } from '@kbn/inspector-plugin/common';
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
): LensApi => ({
  // Static props
  type: 'lens',
  uuid: '1234',
  // Shared Embeddable Observables
  panelTitle: new BehaviorSubject<string | undefined>('myPanel'),
  hidePanelTitle: new BehaviorSubject<boolean | undefined>(false),
  filters$: new BehaviorSubject<Filter[] | undefined>([]),
  query$: new BehaviorSubject<Query | AggregateQuery | undefined>({
    query: 'test',
    language: 'kuery',
  }),
  timeRange$: new BehaviorSubject<TimeRange | undefined>({ from, to }),
  dataLoading: new BehaviorSubject<boolean | undefined>(false),
  // Methods
  getSavedVis: jest.fn(),
  getFullAttributes: () => {
    return mockLensAttributes;
  },
  canViewUnderlyingData: jest.fn(async () => true),
  getViewUnderlyingDataArgs: jest.fn(() => ({
    dataViewSpec: { id: 'index-pattern-id' },
    timeRange: { from: 'now-7d', to: 'now' },
    filters: [],
    query: undefined,
    columns: [],
  })),
  isTextBasedLanguage: jest.fn(() => true),
  getTextBasedLanguage: jest.fn(),
  getInspectorAdapters: jest.fn(() => ({})),
  inspect: jest.fn(),
  closeInspector: jest.fn(async () => {}),
  supportedTriggers: jest.fn(() => []),
  canLinkToLibrary: jest.fn(async () => false),
  canUnlinkFromLibrary: jest.fn(async () => false),
  unlinkFromLibrary: jest.fn(),
  checkForDuplicateTitle: jest.fn(),
  /** New embeddable api inherited methods */
  resetUnsavedChanges: jest.fn(),
  serializeState: jest.fn(),
  snapshotRuntimeState: jest.fn(),
  saveToLibrary: jest.fn(async () => 'saved-id'),
  getByValueRuntimeSnapshot: jest.fn(),
  updateState: jest.fn(),
  onEdit: jest.fn(),
  isEditingEnabled: jest.fn(() => true),
  getTypeDisplayName: jest.fn(() => 'Lens'),
  setPanelTitle: jest.fn(),
  setHidePanelTitle: jest.fn(),
  phase$: new BehaviorSubject<PhaseEvent | undefined>({
    id: '1111',
    status: 'rendered',
    timeToEvent: 1000,
  }),
  unsavedChanges: new BehaviorSubject<object | undefined>(undefined),
  dataViews: new BehaviorSubject<DataView[] | undefined>(undefined),
  libraryId$: new BehaviorSubject<string | undefined>(undefined),
  savedObjectId: new BehaviorSubject<string | undefined>(undefined),
  adapters$: new BehaviorSubject<Adapters>({}),
});

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
