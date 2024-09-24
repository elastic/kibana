/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import faker from 'faker';
import { Query, Filter, AggregateQuery, TimeRange } from '@kbn/es-query';
import { PhaseEvent } from '@kbn/presentation-publishing';
import { DataView } from '@kbn/data-views-plugin/common';
import { Adapters } from '@kbn/inspector-plugin/common';
import { DOC_TYPE } from '../../../common/constants';
import { LensApi, LensRendererProps, LensSerializedState } from '../types';

const LensApiMock: LensApi = {
  // Static props
  type: DOC_TYPE,
  uuid: faker.random.uuid(),
  // Shared Embeddable Observables
  panelTitle: new BehaviorSubject<string | undefined>(faker.lorem.words()),
  hidePanelTitle: new BehaviorSubject<boolean | undefined>(false),
  filters$: new BehaviorSubject<Filter[] | undefined>([]),
  query$: new BehaviorSubject<Query | AggregateQuery | undefined>({
    query: 'test',
    language: 'kuery',
  }),
  timeRange$: new BehaviorSubject<TimeRange | undefined>({ from: 'now-15m', to: 'now' }),
  dataLoading: new BehaviorSubject<boolean | undefined>(false),
  // Methods
  getSavedVis: jest.fn(),
  getFullAttributes: jest.fn(),
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
    id: faker.random.uuid(),
    status: 'rendered',
    timeToEvent: 1000,
  }),
  unsavedChanges: new BehaviorSubject<object | undefined>(undefined),
  dataViews: new BehaviorSubject<DataView[] | undefined>(undefined),
  libraryId$: new BehaviorSubject<string | undefined>(undefined),
  savedObjectId: new BehaviorSubject<string | undefined>(undefined),
  adapters$: new BehaviorSubject<Adapters>({}),
};

const LensSerializedStateMock: LensSerializedState = {
  attributes: {
    title: faker.lorem.words(),
    description: faker.lorem.text(),
    visualizationType: 'lnsXY',
    references: [],
    state: {
      query: { query: 'test', language: 'kuery' },
      filters: [],
      internalReferences: [],
      datasourceStates: {},
      visualization: {},
    },
  },
};

export function getLensApiMock(overrides: Partial<LensApi> = {}) {
  return {
    ...LensApiMock,
    ...overrides,
  };
}

export function getLensSerializedStateMock(overrides: Partial<LensSerializedState> = {}) {
  return {
    ...LensSerializedStateMock,
    ...overrides,
  };
}

export function getLensComponentProps(overrides: Partial<LensRendererProps> = {}) {
  return {
    ...LensSerializedStateMock,
    ...LensApiMock,
    ...overrides,
  };
}
