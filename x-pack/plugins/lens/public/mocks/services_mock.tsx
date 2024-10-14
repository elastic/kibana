/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Subject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { navigationPluginMock } from '@kbn/navigation-plugin/public/mocks';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { indexPatternFieldEditorPluginMock } from '@kbn/data-view-field-editor-plugin/public/mocks';
import { indexPatternEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';

import {
  mockAttributeService,
  createEmbeddableStateTransferMock,
} from '@kbn/embeddable-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import type { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';

import { presentationUtilPluginMock } from '@kbn/presentation-util-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type { LensAttributeService } from '../lens_attribute_service';
import type {
  LensByValueInput,
  LensByReferenceInput,
  LensSavedObjectAttributes,
  LensUnwrapMetaInfo,
} from '../embeddable/embeddable';
import { DOC_TYPE } from '../../common/constants';
import { LensAppServices } from '../app_plugin/types';
import { mockDataPlugin } from './data_plugin_mock';
import { getLensInspectorService } from '../lens_inspector_service';
import { SavedObjectIndexStore } from '../persistence';

const startMock = coreMock.createStart();

export const defaultDoc = {
  savedObjectId: '1234',
  title: 'An extremely cool default document!',
  expression: 'definitely a valid expression',
  visualizationType: 'testVis',
  state: {
    query: 'kuery',
    filters: [{ query: { match_phrase: { src: 'test' } }, meta: { index: 'index-pattern-0' } }],
    datasourceStates: {
      testDatasource: 'datasource',
    },
    visualization: {},
  },
  references: [{ type: 'index-pattern', id: '1', name: 'index-pattern-0' }],
} as unknown as Document;

export const exactMatchDoc = {
  attributes: {
    ...defaultDoc,
  },
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

  const dataViewsMock = dataViewPluginMocks.createStartContract();
  dataViewsMock.get.mockImplementation(
    jest.fn((id) =>
      Promise.resolve({
        id,
        isTimeBased: () => true,
        fields: [],
        isPersisted: () => true,
        toSpec: () => ({}),
      })
    ) as unknown as DataViewsPublicPluginStart['get']
  );
  dataViewsMock.getIdsWithTitle.mockImplementation(jest.fn(async () => []));

  const navigationStartMock = navigationPluginMock.createStartContract();

  jest
    .spyOn(navigationStartMock.ui.AggregateQueryTopNavMenu.prototype, 'constructor')
    .mockImplementation(() => {
      return <div className="topNavMenu" />;
    });

  function makeAttributeService(): LensAttributeService {
    const attributeServiceMock = mockAttributeService<
      LensSavedObjectAttributes,
      LensByValueInput,
      LensByReferenceInput,
      LensUnwrapMetaInfo
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
    ...startMock,
    chrome: core.chrome,
    navigation: navigationStartMock,
    attributeService: makeAttributeService(),
    inspector: {
      adapters: getLensInspectorService(inspectorPluginMock.createStartContract()).adapters,
      inspect: jest.fn(),
      close: jest.fn(),
    },
    presentationUtil: presentationUtilPluginMock.createStartContract(),
    savedObjectStore: {
      load: jest.fn(),
      search: jest.fn(),
      save: jest.fn(),
    } as unknown as SavedObjectIndexStore,
    stateTransfer: createEmbeddableStateTransferMock() as EmbeddableStateTransfer,
    getOriginatingAppName: jest.fn(() => 'defaultOriginatingApp'),
    application: {
      ...core.application,
      capabilities: {
        ...core.application.capabilities,
        visualize: { save: true, saveQuery: true, show: true, createShortUrl: true },
      },
      getUrlForApp: jest.fn((appId: string) => `/testbasepath/app/${appId}#/`),
    },
    data: mockDataPlugin(sessionIdSubject, sessionId),
    dataViews: dataViewsMock,
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    storage: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
    uiActions: uiActionsPluginMock.createStartContract(),
    spaces: spacesPluginMock.createStartContract(),
    charts: chartPluginMock.createSetupContract(),
    dataViewFieldEditor: indexPatternFieldEditorPluginMock.createStartContract(),
    dataViewEditor: indexPatternEditorPluginMock.createStartContract(),
    unifiedSearch: unifiedSearchPluginMock.createStartContract(),
    contentManagement: contentManagementMock.createStartContract(),
    eventAnnotationService: {} as EventAnnotationServiceType,
  };
}
