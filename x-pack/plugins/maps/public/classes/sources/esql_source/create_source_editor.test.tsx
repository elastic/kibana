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
  const mockDataView = {
    fields: [
      {
        name: 'geometry',
        type: 'geo_point',
      },
      {
        name: '@timestamp',
        type: 'date',
      }
    ],
    timeFieldName: '@timestamp',
    getIndexPattern: () => {
      return 'logs';
    },
  };
  return {
    getIndexPatternService() {
      return {
        getDefaultDataView: async () => {
          return mockDataView;
        }
      };
    },
  };
});

describe('CreateSourceEditor', () => {
  test('should preview layer on load', async () => {
    const onSourceConfigChange = jest.fn();
    render(<CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />);
    await waitFor(() => expect(onSourceConfigChange).toBeCalledWith({
      columns: [
        {
          name: 'geometry',
          type: 'geo_point'
        }
      ],
      dateField: '@timestamp',
      esql: 'from logs | keep geometry | limit 10000'
    }));
  });
});