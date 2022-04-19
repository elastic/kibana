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
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { dashboardPluginMock } from '@kbn/dashboard-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

import {
  mockAttributeService,
  createEmbeddableStateTransferMock,
} from '@kbn/embeddable-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import type { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';

import { presentationUtilPluginMock } from '@kbn/presentation-util-plugin/public/mocks';
import type { LensAttributeService } from '../lens_attribute_service';
import type {
  LensByValueInput,
  LensByReferenceInput,
  LensSavedObjectAttributes,
  LensUnwrapMetaInfo,
} from '../embeddable/embeddable';
import { DOC_TYPE } from '../../common';
import { LensAppServices } from '../app_plugin/types';
import { mockDataPlugin } from './data_plugin_mock';
import { getLensInspectorService } from '../lens_inspector_service';

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
      Promise.resolve({ id, isTimeBased: () => true })
    ) as unknown as DataViewsPublicPluginStart['get']
  );

  const navigationStartMock = navigationPluginMock.createStartContract();

  jest.spyOn(navigationStartMock.ui.TopNavMenu.prototype, 'constructor').mockImplementation(() => {
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
    http: core.http,
    chrome: core.chrome,
    overlays: core.overlays,
    uiSettings: core.uiSettings,
    executionContext: core.executionContext,
    navigation: navigationStartMock,
    notifications: core.notifications,
    attributeService: makeAttributeService(),
    inspector: {
      adapters: getLensInspectorService(inspectorPluginMock.createStartContract()).adapters,
      inspect: jest.fn(),
      close: jest.fn(),
    },
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
    dataViews: dataViewsMock,
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
