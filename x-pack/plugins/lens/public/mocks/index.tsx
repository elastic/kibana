/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ReactWrapper } from 'enzyme';
// eslint-disable-next-line import/no-extraneous-dependencies
import { mountWithIntl as mount } from '@kbn/test/jest';
import { Subject } from 'rxjs';
import { coreMock } from 'src/core/public/mocks';
import { Provider } from 'react-redux';
import { act } from 'react-dom/test-utils';
import { ReactExpressionRendererProps } from 'src/plugins/expressions/public';
import { PreloadedState } from '@reduxjs/toolkit';
import { LensPublicStart } from '..';
import { visualizationTypes } from '../xy_visualization/types';
import { navigationPluginMock } from '../../../../../src/plugins/navigation/public/mocks';
import { LensAppServices } from '../app_plugin/types';
import { DOC_TYPE } from '../../common';
import { UI_SETTINGS } from '../../../../../src/plugins/data/public';
import { inspectorPluginMock } from '../../../../../src/plugins/inspector/public/mocks';
import { spacesPluginMock } from '../../../spaces/public/mocks';
import { dashboardPluginMock } from '../../../../../src/plugins/dashboard/public/mocks';
import type {
  LensByValueInput,
  LensByReferenceInput,
  ResolvedLensSavedObjectAttributes,
} from '../embeddable/embeddable';
import {
  mockAttributeService,
  createEmbeddableStateTransferMock,
} from '../../../../../src/plugins/embeddable/public/mocks';
import { fieldFormatsServiceMock } from '../../../../../src/plugins/field_formats/public/mocks';
import type { LensAttributeService } from '../lens_attribute_service';
import type { EmbeddableStateTransfer } from '../../../../../src/plugins/embeddable/public';

import {
  makeConfigureStore,
  LensAppState,
  LensState,
  LensStoreDeps,
} from '../state_management/index';
import { getResolvedDateRange } from '../utils';
import { presentationUtilPluginMock } from '../../../../../src/plugins/presentation_util/public/mocks';
import { FramePublicAPI, FrameDatasourceAPI, DatasourceMap, VisualizationMap } from '../types';
import { mockDataPlugin } from './data_plugin_mock';
import { mockVisualizationMap } from './visualization_mock';
import { mockDatasourceMap } from './datasource_mock';

export { mockDataPlugin } from './data_plugin_mock';
export {
  visualizationMap,
  createMockVisualization,
  mockVisualizationMap,
} from './visualization_mock';
export { datasourceMap, mockDatasourceMap, createMockDatasource } from './datasource_mock';
export type { DatasourceMock } from './datasource_mock';

export function createExpressionRendererMock(): jest.Mock<
  React.ReactElement,
  [ReactExpressionRendererProps]
> {
  return jest.fn((_) => <span />);
}

export type FrameMock = jest.Mocked<FramePublicAPI>;

export function createMockFramePublicAPI(): FrameMock {
  return {
    datasourceLayers: {},
  };
}

export type FrameDatasourceMock = jest.Mocked<FrameDatasourceAPI>;
export function createMockFrameDatasourceAPI(): FrameDatasourceMock {
  return {
    datasourceLayers: {},
    dateRange: { fromDate: 'now-7d', toDate: 'now' },
    query: { query: '', language: 'lucene' },
    filters: [],
  };
}

export type Start = jest.Mocked<LensPublicStart>;

const createStartContract = (): Start => {
  const startContract: Start = {
    EmbeddableComponent: jest.fn(() => {
      return <span>Lens Embeddable Component</span>;
    }),
    SaveModalComponent: jest.fn(() => {
      return <span>Lens Save Modal Component</span>;
    }),
    canUseEditor: jest.fn(() => true),
    navigateToPrefilledEditor: jest.fn(),
    getXyVisTypes: jest.fn().mockReturnValue(new Promise((resolve) => resolve(visualizationTypes))),
  };
  return startContract;
};

export const lensPluginMock = {
  createStartContract,
};

export const defaultDoc = {
  savedObjectId: '1234',
  title: 'An extremely cool default document!',
  expression: 'definitely a valid expression',
  visualizationType: 'testVis',
  state: {
    query: 'kuery',
    filters: [{ query: { match_phrase: { src: 'test' } } }],
    datasourceStates: {
      testDatasource: 'datasource',
    },
    visualization: {},
  },
  references: [{ type: 'index-pattern', id: '1', name: 'index-pattern-0' }],
} as unknown as Document;

export const exactMatchDoc = {
  ...defaultDoc,
  sharingSavedObjectProps: {
    outcome: 'exactMatch',
  },
};

export function makeDefaultServices(
  sessionIdSubject = new Subject<string>(),
  sessionId: string | undefined = undefined,
  doc = defaultDoc
): jest.Mocked<LensAppServices> {
  const core = coreMock.createStart({ basePath: '/testbasepath' });
  core.uiSettings.get.mockImplementation(
    jest.fn((type) => {
      if (type === UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS) {
        return { from: 'now-7d', to: 'now' };
      } else if (type === UI_SETTINGS.SEARCH_QUERY_LANGUAGE) {
        return 'kuery';
      } else if (type === 'state:storeInSessionStorage') {
        return false;
      } else {
        return [];
      }
    })
  );

  const navigationStartMock = navigationPluginMock.createStartContract();

  jest.spyOn(navigationStartMock.ui.TopNavMenu.prototype, 'constructor').mockImplementation(() => {
    return <div className="topNavMenu" />;
  });

  function makeAttributeService(): LensAttributeService {
    const attributeServiceMock = mockAttributeService<
      ResolvedLensSavedObjectAttributes,
      LensByValueInput,
      LensByReferenceInput
    >(
      DOC_TYPE,
      {
        saveMethod: jest.fn(),
        unwrapMethod: jest.fn(),
        checkForDuplicateTitle: jest.fn(),
      },
      core
    );
    attributeServiceMock.unwrapAttributes = jest.fn().mockResolvedValue(exactMatchDoc);
    attributeServiceMock.wrapAttributes = jest.fn().mockResolvedValue({
      savedObjectId: (doc as unknown as LensByReferenceInput).savedObjectId,
    });

    return attributeServiceMock;
  }

  return {
    http: core.http,
    chrome: core.chrome,
    overlays: core.overlays,
    uiSettings: core.uiSettings,
    navigation: navigationStartMock,
    notifications: core.notifications,
    attributeService: makeAttributeService(),
    inspector: inspectorPluginMock.createStartContract(),
    dashboard: dashboardPluginMock.createStartContract(),
    presentationUtil: presentationUtilPluginMock.createStartContract(core),
    savedObjectsClient: core.savedObjects.client,
    dashboardFeatureFlag: { allowByValueEmbeddables: false },
    stateTransfer: createEmbeddableStateTransferMock() as EmbeddableStateTransfer,
    getOriginatingAppName: jest.fn(() => 'defaultOriginatingApp'),
    application: {
      ...core.application,
      capabilities: {
        ...core.application.capabilities,
        visualize: { save: true, saveQuery: true, show: true },
      },
      getUrlForApp: jest.fn((appId: string) => `/testbasepath/app/${appId}#/`),
    },
    data: mockDataPlugin(sessionIdSubject, sessionId),
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    storage: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
    spaces: spacesPluginMock.createStartContract(),
  };
}

export const mockStoreDeps = (deps?: {
  lensServices?: LensAppServices;
  datasourceMap?: DatasourceMap;
  visualizationMap?: VisualizationMap;
}) => {
  return {
    datasourceMap: deps?.datasourceMap || mockDatasourceMap(),
    visualizationMap: deps?.visualizationMap || mockVisualizationMap(),
    lensServices: deps?.lensServices || makeDefaultServices(),
  };
};

export function mockDatasourceStates() {
  return {
    testDatasource: {
      state: {},
      isLoading: false,
    },
  };
}

export const defaultState = {
  searchSessionId: 'sessionId-1',
  filters: [],
  query: { language: 'lucene', query: '' },
  resolvedDateRange: { fromDate: '2021-01-10T04:00:00.000Z', toDate: '2021-01-10T08:00:00.000Z' },
  isFullscreenDatasource: false,
  isSaveable: false,
  isLoading: false,
  isLinkedToOriginatingApp: false,
  activeDatasourceId: 'testDatasource',
  visualization: {
    state: {},
    activeId: 'testVis',
  },
  datasourceStates: mockDatasourceStates(),
};

export function makeLensStore({
  preloadedState,
  dispatch,
  storeDeps = mockStoreDeps(),
}: {
  storeDeps?: LensStoreDeps;
  preloadedState?: Partial<LensAppState>;
  dispatch?: jest.Mock;
}) {
  const data = storeDeps.lensServices.data;
  const store = makeConfigureStore(storeDeps, {
    lens: {
      ...defaultState,
      query: data.query.queryString.getQuery(),
      filters: data.query.filterManager.getGlobalFilters(),
      resolvedDateRange: getResolvedDateRange(data.query.timefilter.timefilter),
      ...preloadedState,
    },
  } as PreloadedState<LensState>);

  const origDispatch = store.dispatch;
  store.dispatch = jest.fn(dispatch || origDispatch);
  return { store, deps: storeDeps };
}

export interface MountStoreProps {
  storeDeps?: LensStoreDeps;
  preloadedState?: Partial<LensAppState>;
  dispatch?: jest.Mock;
}

export const mountWithProvider = async (
  component: React.ReactElement,
  store?: MountStoreProps,
  options?: {
    wrappingComponent?: React.FC<{
      children: React.ReactNode;
    }>;
    attachTo?: HTMLElement;
  }
) => {
  const { store: lensStore, deps } = makeLensStore(store || {});

  let wrappingComponent: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => <Provider store={lensStore}>{children}</Provider>;

  let restOptions: {
    attachTo?: HTMLElement | undefined;
  };
  if (options) {
    const { wrappingComponent: _wrappingComponent, ...rest } = options;
    restOptions = rest;

    if (_wrappingComponent) {
      wrappingComponent = ({ children }) => {
        return _wrappingComponent({
          children: <Provider store={lensStore}>{children}</Provider>,
        });
      };
    }
  }

  let instance: ReactWrapper = {} as ReactWrapper;

  await act(async () => {
    instance = mount(component, {
      wrappingComponent,
      ...restOptions,
    } as unknown as ReactWrapper);
  });
  return { instance, lensStore, deps };
};
