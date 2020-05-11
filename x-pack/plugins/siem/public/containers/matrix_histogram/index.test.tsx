/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useQuery } from '.';
import { mount } from 'enzyme';
import React from 'react';
import { useApolloClient } from '../../utils/apollo_context';
import { errorToToaster } from '../../components/toasters';
import { MatrixOverTimeHistogramData, HistogramType } from '../../../graphql/types';
import { InspectQuery, Refetch } from '../../store/inputs/model';

const mockQuery = jest.fn().mockResolvedValue({
  data: {
    source: {
      MatrixHistogram: {
        matrixHistogramData: [{}],
        totalCount: 1,
        inspect: false,
      },
    },
  },
});

const mockRejectQuery = jest.fn().mockRejectedValue(new Error());
jest.mock('../../utils/apollo_context', () => ({
  useApolloClient: jest.fn(),
}));

jest.mock('../../lib/kibana', () => {
  return {
    useUiSetting$: jest.fn().mockReturnValue(['mockDefaultIndex']),
  };
});

jest.mock('./index.gql_query', () => {
  return {
    MatrixHistogramGqlQuery: 'mockGqlQuery',
  };
});

jest.mock('../../components/toasters/', () => ({
  useStateToaster: () => [jest.fn(), jest.fn()],
  errorToToaster: jest.fn(),
}));

describe('useQuery', () => {
  let result: {
    data: MatrixOverTimeHistogramData[] | null;
    loading: boolean;
    inspect: InspectQuery | null;
    totalCount: number;
    refetch: Refetch | undefined;
  };
  describe('happy path', () => {
    beforeAll(() => {
      (useApolloClient as jest.Mock).mockReturnValue({
        query: mockQuery,
      });
      const TestComponent = () => {
        result = useQuery({
          endDate: 100,
          errorMessage: 'fakeErrorMsg',
          filterQuery: '',
          histogramType: HistogramType.alerts,
          isInspected: false,
          stackByField: 'fakeField',
          startDate: 0,
        });

        return <div />;
      };

      mount(<TestComponent />);
    });

    test('should set variables', () => {
      expect(mockQuery).toBeCalledWith({
        query: 'mockGqlQuery',
        fetchPolicy: 'network-only',
        variables: {
          filterQuery: '',
          sourceId: 'default',
          timerange: {
            interval: '12h',
            from: 0,
            to: 100,
          },
          defaultIndex: 'mockDefaultIndex',
          inspect: false,
          stackByField: 'fakeField',
          histogramType: 'alerts',
        },
        context: {
          fetchOptions: {
            abortSignal: new AbortController().signal,
          },
        },
      });
    });

    test('should setData', () => {
      expect(result.data).toEqual([{}]);
    });

    test('should set total count', () => {
      expect(result.totalCount).toEqual(1);
    });

    test('should set inspect', () => {
      expect(result.inspect).toEqual(false);
    });
  });

  describe('failure path', () => {
    beforeAll(() => {
      mockQuery.mockClear();
      (useApolloClient as jest.Mock).mockReset();
      (useApolloClient as jest.Mock).mockReturnValue({
        query: mockRejectQuery,
      });
      const TestComponent = () => {
        result = useQuery({
          endDate: 100,
          errorMessage: 'fakeErrorMsg',
          filterQuery: '',
          histogramType: HistogramType.alerts,
          isInspected: false,
          stackByField: 'fakeField',
          startDate: 0,
        });

        return <div />;
      };

      mount(<TestComponent />);
    });

    test('should setData', () => {
      expect(result.data).toEqual(null);
    });

    test('should set total count', () => {
      expect(result.totalCount).toEqual(-1);
    });

    test('should set inspect', () => {
      expect(result.inspect).toEqual(null);
    });

    test('should set error to toster', () => {
      expect(errorToToaster).toHaveBeenCalled();
    });
  });
});
