/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { CreateSourceEditor } from './create_source_editor';

jest.mock('../../../kibana_services', () => {
  const mockDefaultDataView = {
    fields: [
      {
        name: 'location',
        type: 'geo_point',
      },
      {
        name: '@timestamp',
        type: 'date',
      },
    ],
    timeFieldName: '@timestamp',
    getIndexPattern: () => {
      return 'logs';
    },
  };
  const mockDataView = {
    fields: [
      {
        name: 'geometry',
        type: 'geo_shape',
      },
    ],
    getIndexPattern: () => {
      return 'world_countries';
    },
  };
  return {
    getIndexPatternService() {
      return {
        get: async () => {
          return mockDataView;
        },
        getDefaultDataView: async () => {
          return mockDefaultDataView;
        },
      };
    },
  };
});

describe('CreateSourceEditor', () => {
  test('should preview default data view on load', async () => {
    const onSourceConfigChange = jest.fn();
    render(<CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />);
    await waitFor(() =>
      expect(onSourceConfigChange).toBeCalledWith({
        columns: [
          {
            name: 'location',
            type: 'geo_point',
          },
        ],
        dateField: '@timestamp',
        esql: 'from logs | keep location | limit 10000',
        geoField: 'location',
        narrowByGlobalSearch: true,
        narrowByGlobalTime: true,
        narrowByMapBounds: true,
      })
    );
  });

  test('should preview requested data view on load when mostCommonDataViewId prop provided', async () => {
    const onSourceConfigChange = jest.fn();
    render(
      <CreateSourceEditor
        onSourceConfigChange={onSourceConfigChange}
        mostCommonDataViewId="123abc"
      />
    );
    await waitFor(() =>
      expect(onSourceConfigChange).toBeCalledWith({
        columns: [
          {
            name: 'geometry',
            type: 'geo_shape',
          },
        ],
        dateField: undefined,
        esql: 'from world_countries | keep geometry | limit 10000',
        geoField: 'geometry',
        narrowByGlobalSearch: true,
        narrowByGlobalTime: false,
        narrowByMapBounds: true,
      })
    );
  });
});
