/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockGlobalState } from '../../common/mock';
import type { SelectedDataView } from '../store/model';
import { initSourcererScope } from '../store/model';
import { mockBrowserFields, mockRuntimeMappings } from '../../common/containers/source/mock';

export const mockPatterns = [
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'winlogbeat-*',
  'journalbeat-*',
];

export const mockSourcererScope: SelectedDataView = {
  ...initSourcererScope,
  browserFields: {
    ...mockBrowserFields,
    _id: {
      fields: {
        _id: {
          aggregatable: false,
          category: '_id',
          description: 'Each document has an _id that uniquely identifies it',
          esTypes: undefined,
          example: 'Y-6TfmcB0WOhS6qyMv3s',
          format: undefined,
          indexes: mockPatterns,
          name: '_id',
          searchable: true,
          subType: undefined,
          type: 'string',
        },
      },
    },
  },
  indexPattern: {
    fields: [
      {
        aggregatable: false,
        esTypes: undefined,
        name: '_id',
        searchable: true,
        subType: undefined,
        type: 'string',
      },
    ],
    title: mockPatterns.join(),
  },
  sourcererDataView: mockGlobalState.sourcerer.defaultDataView,
  selectedPatterns: mockPatterns,
  indicesExist: true,
  loading: false,
  dataViewId: mockGlobalState.sourcerer.defaultDataView.id,
  runtimeMappings: mockRuntimeMappings,
  patternList: mockPatterns,
};
