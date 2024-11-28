/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import deepMerge from 'deepmerge';
import React from 'react';
import faker from 'faker';
import { Query, Filter, AggregateQuery, TimeRange } from '@kbn/es-query';
import { PhaseEvent, ViewMode } from '@kbn/presentation-publishing';
import { DataView } from '@kbn/data-views-plugin/common';
import { Adapters } from '@kbn/inspector-plugin/common';
import { coreMock } from '@kbn/core/public/mocks';
import { visualizationsPluginMock } from '@kbn/visualizations-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { ReactExpressionRendererProps } from '@kbn/expressions-plugin/public';
import { ReactEmbeddableDynamicActionsApi } from '@kbn/embeddable-enhanced-plugin/public/plugin';
import { DOC_TYPE } from '../../../common/constants';
import { createEmptyLensState } from '../helper';
import {
  ExpressionWrapperProps,
  LensApi,
  LensEmbeddableStartServices,
  LensInternalApi,
  LensRendererProps,
  LensRuntimeState,
  LensSerializedState,
  VisualizationContext,
} from '../types';
import {
  createMockDatasource,
  createMockVisualization,
  defaultDoc,
  makeDefaultServices,
} from '../../mocks';
import {
  Datasource,
  DatasourceMap,
  UserMessage,
  Visualization,
  VisualizationMap,
} from '../../types';

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
  canViewUnderlyingData$: new BehaviorSubject<boolean>(false),
  loadViewUnderlyingData: jest.fn(),
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
  updateAttributes: jest.fn(),
  updateSavedObjectId: jest.fn(),
  updateOverrides: jest.fn(),
  getByReferenceState: jest.fn(),
  getByValueState: jest.fn(),
  getTriggerCompatibleActions: jest.fn(),
  blockingError: new BehaviorSubject<Error | undefined>(undefined),
  panelDescription: new BehaviorSubject<string | undefined>(undefined),
  setPanelDescription: jest.fn(),
  viewMode: new BehaviorSubject<ViewMode>('view'),
  disabledActionIds: new BehaviorSubject<string[] | undefined>(undefined),
  setDisabledActionIds: jest.fn(),
  rendered$: new BehaviorSubject<boolean>(false),
};

const LensSerializedStateMock: LensSerializedState = createEmptyLensState(
  'lnsXY',
  faker.lorem.words(),
  faker.lorem.text(),
  { query: 'test', language: 'kuery' }
);

export function getLensAttributesMock(attributes?: Partial<LensRuntimeState['attributes']>) {
  return deepMerge(LensSerializedStateMock.attributes!, attributes ?? {});
}

export function getLensApiMock(overrides: Partial<LensApi> = {}) {
  return {
    ...LensApiMock,
    ...overrides,
  };
}

export function getLensSerializedStateMock(overrides: Partial<LensSerializedState> = {}) {
  return {
    savedObjectId: faker.random.uuid(),
    ...LensSerializedStateMock,
    ...overrides,
  };
}

export function getLensRuntimeStateMock(
  overrides: Partial<LensRuntimeState> = {}
): LensRuntimeState {
  return {
    ...(LensSerializedStateMock as LensRuntimeState),
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

export function makeEmbeddableServices(
  sessionIdSubject = new Subject<string>(),
  sessionId: string | undefined = undefined,
  {
    visOverrides,
    dataOverrides,
  }: {
    visOverrides?: { id: string } & Partial<Visualization>;
    dataOverrides?: { id: string } & Partial<Datasource>;
  } = {}
): jest.Mocked<LensEmbeddableStartServices> {
  const services = makeDefaultServices(sessionIdSubject, sessionId);
  return {
    ...services,
    expressions: expressionsPluginMock.createStartContract(),
    visualizations: visualizationsPluginMock.createStartContract(),
    embeddable: embeddablePluginMock.createStartContract(),
    eventAnnotation: {} as LensEmbeddableStartServices['eventAnnotation'],
    timefilter: services.data.query.timefilter.timefilter,
    coreHttp: services.http,
    coreStart: coreMock.createStart(),
    capabilities: services.application.capabilities,
    expressionRenderer: jest.fn().mockReturnValue(null),
    documentToExpression: jest.fn(),
    injectFilterReferences: services.data.query.filterManager.inject as jest.Mock,
    visualizationMap: mockVisualizationMap(visOverrides?.id, visOverrides),
    datasourceMap: mockDatasourceMap(dataOverrides?.id, dataOverrides),
    charts: chartPluginMock.createStartContract(),
    inspector: {
      ...services.inspector,
      isAvailable: jest.fn().mockReturnValue(true),
      open: jest.fn(),
    },
    uiActions: {
      ...services.uiActions,
      getTrigger: jest.fn().mockImplementation(() => ({ exec: jest.fn() })),
    },
    embeddableEnhanced: {
      initializeReactEmbeddableDynamicActions: jest.fn(
        () =>
          ({
            dynamicActionsApi: {
              enhancements: { dynamicActions: {} },
              setDynamicActions: jest.fn(),
              dynamicActionsState$: {},
            },
            dynamicActionsComparator: jest.fn(),
            serializeDynamicActions: jest.fn(),
            startDynamicActions: jest.fn(),
          } as unknown as ReactEmbeddableDynamicActionsApi)
      ),
    },
  };
}

export const mockVisualizationMap = (
  type: string | undefined = undefined,
  overrides: Partial<Visualization> = {}
): VisualizationMap => {
  if (type == null) {
    return {};
  }
  return {
    [type]: { ...createMockVisualization(type), ...overrides },
  };
};

export const mockDatasourceMap = (
  type: string | undefined = undefined,
  overrides: Partial<Datasource> = {}
): DatasourceMap => {
  const baseMap = {
    // define the existing ones
    formBased: createMockDatasource('formBased'),
    textBased: createMockDatasource('textBased'),
  };
  if (type == null) {
    return baseMap;
  }
  return {
    // define the existing ones
    ...baseMap,
    // override at will
    [type]: {
      ...createMockDatasource(type),
      ...overrides,
    },
  };
};

export function createExpressionRendererMock(): jest.Mock<
  React.ReactElement,
  [ReactExpressionRendererProps]
> {
  return jest.fn(({ expression }) => (
    <span data-test-subj="lnsExpressionRenderer">
      {(expression as string) || 'Expression renderer mock'}
    </span>
  ));
}

function getValidExpressionParams(
  overrides: Partial<ExpressionWrapperProps> = {}
): ExpressionWrapperProps {
  return {
    ExpressionRenderer: createExpressionRendererMock(),
    expression: 'test',
    searchContext: {},
    handleEvent: jest.fn(),
    onData$: jest.fn(),
    onRender$: jest.fn(),
    addUserMessages: jest.fn(),
    onRuntimeError: jest.fn(),
    lensInspector: {
      getInspectorAdapters: jest.fn(),
      inspect: jest.fn(),
      closeInspector: jest.fn(),
    },
    ...overrides,
  };
}

const LensInternalApiMock: LensInternalApi = {
  dataViews: new BehaviorSubject<DataView[] | undefined>(undefined),
  attributes$: new BehaviorSubject<LensRuntimeState['attributes']>(defaultDoc),
  overrides$: new BehaviorSubject<LensRuntimeState['overrides']>(undefined),
  disableTriggers$: new BehaviorSubject<LensRuntimeState['disableTriggers']>(undefined),
  dataLoading$: new BehaviorSubject<boolean | undefined>(undefined),
  hasRenderCompleted$: new BehaviorSubject<boolean>(true),
  expressionParams$: new BehaviorSubject<ExpressionWrapperProps | null>(getValidExpressionParams()),
  expressionAbortController$: new BehaviorSubject<AbortController | undefined>(undefined),
  renderCount$: new BehaviorSubject<number>(0),
  messages$: new BehaviorSubject<UserMessage[]>([]),
  validationMessages$: new BehaviorSubject<UserMessage[]>([]),
  isNewlyCreated$: new BehaviorSubject<boolean>(true),
  updateAttributes: jest.fn(),
  updateOverrides: jest.fn(),
  dispatchRenderStart: jest.fn(),
  dispatchRenderComplete: jest.fn(),
  updateDataLoading: jest.fn(),
  updateExpressionParams: jest.fn(),
  updateAbortController: jest.fn(),
  updateDataViews: jest.fn(),
  updateMessages: jest.fn(),
  resetAllMessages: jest.fn(),
  dispatchError: jest.fn(),
  updateValidationMessages: jest.fn(),
  setAsCreated: jest.fn(),
};

export function getLensInternalApiMock(overrides: Partial<LensInternalApi> = {}): LensInternalApi {
  return {
    ...LensInternalApiMock,
    ...overrides,
  };
}

export function getVisualizationContextHelperMock(
  attributesOverrides?: Partial<LensRuntimeState['attributes']>,
  contextOverrides?: Omit<Partial<VisualizationContext>, 'doc'>
) {
  return {
    getVisualizationContext: jest.fn(() => ({
      mergedSearchContext: {},
      indexPatterns: {},
      indexPatternRefs: [],
      activeVisualizationState: undefined,
      activeDatasourceState: undefined,
      activeData: undefined,
      ...contextOverrides,
      doc: getLensAttributesMock(attributesOverrides),
    })),
    updateVisualizationContext: jest.fn(),
  };
}

export function createUnifiedSearchApi(
  query: Query | AggregateQuery = {
    query: '',
    language: 'kuery',
  },
  filters: Filter[] = [],
  timeRange: TimeRange = { from: 'now-7d', to: 'now' }
) {
  return {
    filters$: new BehaviorSubject<Filter[] | undefined>(filters),
    query$: new BehaviorSubject<Query | AggregateQuery | undefined>(query),
    timeRange$: new BehaviorSubject<TimeRange | undefined>(timeRange),
  };
}
