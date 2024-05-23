/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { dashboardPluginMock } from '@kbn/dashboard-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { presentationUtilPluginMock } from '@kbn/presentation-util-plugin/public/mocks';
import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';
import { navigationPluginMock } from '@kbn/navigation-plugin/public/mocks';
import { createObservabilityRuleTypeRegistryMock } from '@kbn/observability-plugin/public';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { discoverPluginMock } from '@kbn/discover-plugin/server/mocks';
import { indexPatternFieldEditorPluginMock as dataViewFieldEditorPluginMock } from '@kbn/data-view-field-editor-plugin/public/mocks';
import { ToastsStart } from '@kbn/core/public';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

const triggersActionsUiStartMock = {
  createStart() {
    return {
      ruleTypeRegistry: {
        has: jest.fn(),
        register: jest.fn(),
        get: jest.fn(),
        list: jest.fn(),
      },
      actionTypeRegistry: {
        has: jest.fn((x) => true),
        register: jest.fn(),
        get: jest.fn(),
        list: jest.fn(),
      },
    };
  },
};

const dataViewEditor = {
  createStart() {
    return {
      userPermissions: {
        editDataView: jest.fn(),
      },
    };
  },
};

export const sloPublicPluginsStartMock = {
  createStart() {
    return {
      actionTypeRegistry: actionTypeRegistryMock.create(),
      cases: mockCasesContract(),
      charts: chartPluginMock.createStartContract(),
      data: dataPluginMock.createStartContract(),
      dataViewEditor: dataViewEditor.createStart(),
      dataViews: dataViewPluginMocks.createStartContract(),
      lens: lensPluginMock.createStartContract(),
      share: sharePluginMock.createStartContract(),
      triggersActionsUi: triggersActionsUiStartMock.createStart(),
      unifiedSearch: unifiedSearchPluginMock.createStartContract(),
      dashboard: dashboardPluginMock.createStartContract(),
      fieldFormats: fieldFormatsServiceMock.createStartContract(),
      embeddable: embeddablePluginMock.createStartContract(),
      uiActions: uiActionsPluginMock.createStartContract(),
      presentationUtil: presentationUtilPluginMock.createStartContract(coreMock.createStart()),
      navigation: navigationPluginMock.createStartContract(),
      // security:
      licensing: licensingMock.createStart(),
      ruleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
      usageCollection: usageCollectionPluginMock.createSetupContract(),
      discover: discoverPluginMock.createStartContract(),
      dataViewFieldEditor: dataViewFieldEditorPluginMock.createStartContract(),
      // observability: ,
      // observabilityShared: ,
      // aiops:
      toastNotifications: {
        addInfo: jest.fn(),
        addWarning: jest.fn(),
        addDanger: jest.fn(),
        addSuccess: jest.fn(),
      } as unknown as ToastsStart,
    };
  },
};
