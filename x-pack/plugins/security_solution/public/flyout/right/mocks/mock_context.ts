/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RISK_SCORE, ALERT_SEVERITY } from '@kbn/rule-data-utils';
import type { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import type { State } from '@kbn/expandable-flyout/src/reducer';
import type { RightPanelContext } from '../context';

/**
 * Returns mocked data for field (mock this method: x-pack/plugins/security_solution/public/common/hooks/use_get_fields_data.ts)
 * @param field
 * @returns string[]
 */
export const mockGetFieldsData = (field: string): string[] => {
  switch (field) {
    case ALERT_SEVERITY:
      return ['low'];
    case ALERT_RISK_SCORE:
      return ['0'];
    case 'host.name':
      return ['host1'];
    case 'user.name':
      return ['user1'];
    default:
      return [];
  }
};

/**
 * Mock an array of fields for an alert
 */
export const mockDataFormattedForFieldBrowser = [
  {
    category: 'kibana',
    field: 'kibana.alert.rule.uuid',
    values: ['rule-uuid'],
    originalValue: ['rule-uuid'],
    isObjectArray: false,
  },
  {
    category: 'kibana',
    field: 'kibana.alert.rule.name',
    values: ['rule-name'],
    originalValue: ['rule-name'],
    isObjectArray: false,
  },
  {
    category: 'base',
    field: '@timestamp',
    values: ['2023-01-01T01:01:01.000Z'],
    originalValue: ['2023-01-01T01:01:01.000Z'],
    isObjectArray: false,
  },
  {
    category: 'kibana',
    field: 'kibana.alert.rule.description',
    values: ['rule-description'],
    originalValue: ['rule-description'],
    isObjectArray: false,
  },
  {
    category: 'kibana',
    field: 'kibana.alert.ancestors.id',
    values: ['ancestors-id'],
    originalValue: ['ancestors-id'],
    isObjectArray: false,
  },
  {
    category: 'kibana',
    field: 'kibana.alert.rule.parameters.index',
    values: ['rule-parameters-index'],
    originalValue: ['rule-parameters-index'],
    isObjectArray: false,
  },
  {
    category: 'process',
    field: 'process.entity_id',
    values: ['process-entity_id'],
    originalValue: ['process-entity_id'],
    isObjectArray: false,
  },
];

/**
 * Mock an object of nested properties for an alert
 */
export const mockDataAsNestedObject = {
  _id: '123',
  '@timestamp': ['2023-01-01T01:01:01.000Z'],
  event: {
    category: ['malware'],
    kind: ['signal'],
  },
  host: {
    name: ['host-name'],
  },
  kibana: {
    alert: {
      rule: {
        name: ['rule-name'],
      },
      severity: ['low'],
    },
  },
  process: {
    name: ['process-name'],
  },
};

/**
 * Mock the document result of the search for an alert
 */
export const mockSearchHit = {
  fields: {
    'kibana.alert.rule.parameters': [
      {
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: '123',
              reference: 'https://attack.mitre.org/tactics/123',
              name: 'Tactic',
            },
            technique: [
              {
                id: '456',
                reference: 'https://attack.mitre.org/techniques/456',
                name: 'Technique',
              },
            ],
          },
        ],
      },
    ],
  },
};

/**
 * Mock contextValue for right panel context
 */
export const mockContextValue: RightPanelContext = {
  eventId: 'eventId',
  indexName: 'index',
  scopeId: 'scopeId',
  getFieldsData: mockGetFieldsData,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  browserFields: null,
  dataAsNestedObject: null,
  searchHit: undefined,
  refetchFlyoutData: jest.fn(),
};

/**
 * Mock flyout context
 */
export const mockFlyoutContextValue: ExpandableFlyoutContext = {
  panels: {} as State,
  openFlyout: jest.fn(),
  openRightPanel: jest.fn(),
  openLeftPanel: jest.fn(),
  openPreviewPanel: jest.fn(),
  closeRightPanel: jest.fn(),
  closeLeftPanel: jest.fn(),
  closePreviewPanel: jest.fn(),
  previousPreviewPanel: jest.fn(),
  closeFlyout: jest.fn(),
};
