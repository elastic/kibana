/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  getVisitorBreakdownLensAttributes,
  VisitorBreakdownChart,
  VisitorBreakdownMetric,
} from './visitor_breakdown_chart';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import type { DataView } from '@kbn/data-views-plugin/public';

jest.mock('../../../../hooks/use_kibana_services');
jest.mock('uuid');

const mockDataView = {
  id: 'mock-id',
  title: 'mock-title',
  timeFieldName: 'mock-time-field-name',
  isPersisted: () => false,
  getName: () => 'mock-data-view',
  toSpec: () => ({}),
} as DataView;

describe('VisitorBreakdownChart', () => {
  describe('getVisitorBreakdownLensAttributes', () => {
    test('generates expected lens attributes', () => {
      const props = {
        metric: VisitorBreakdownMetric.OS_BREAKDOWN,
        uiFilters: {
          environment: 'ENVIRONMENT_ALL',
        },
        urlQuery: 'elastic.co',
        dataView: mockDataView,
        localDataViewId: 'xxxx-xxxxxxxxxxx-xxxx',
      };

      expect(getVisitorBreakdownLensAttributes(props)).toMatchSnapshot();
    });
  });

  describe('component', () => {
    const mockUuid = jest.requireMock('uuid');
    mockUuid.v4 = jest.fn().mockReturnValue('xxxx-xxxxxxxxxxx-xxxx');
    const mockEmbeddableComponent = jest.fn((_) => <></>);

    beforeEach(() => {
      jest.clearAllMocks();
      (useKibanaServices as jest.Mock).mockReturnValue({
        lens: {
          EmbeddableComponent: mockEmbeddableComponent,
        },
      });
    });

    test('calls lens with original attributes', () => {
      const props = {
        start: '0',
        end: '5000',
        metric: VisitorBreakdownMetric.OS_BREAKDOWN,
        uiFilters: {
          environment: 'ENVIRONMENT_ALL',
        },
        urlQuery: 'elastic.co',
        dataView: mockDataView,
        localDataViewId: 'xxxx-xxxxxxxxxxx-xxxx',
        onFilter: (_m: VisitorBreakdownMetric, _e: any) => {},
      };

      const { container: _ } = render(<VisitorBreakdownChart {...props} />);

      expect(mockEmbeddableComponent).toHaveBeenCalledTimes(1);
      expect(mockEmbeddableComponent.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          timeRange: {
            from: props.start,
            to: props.end,
          },
          attributes: getVisitorBreakdownLensAttributes(props),
        })
      );
    });
  });
});
