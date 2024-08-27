/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useIndicatorById, UseIndicatorByIdValue } from './use_indicator_by_id';
import { TestProvidersComponent } from '../../../mocks/test_providers';
import { createFetchIndicatorById } from '../services/fetch_indicator_by_id';
import { Indicator } from '../../../../common/types/indicator';

jest.mock('../services/fetch_indicator_by_id');

const indicatorByIdQueryResult = { _id: 'testId' } as unknown as Indicator;

const renderUseIndicatorById = (initialProps = { indicatorId: 'testId' }) =>
  renderHook<{ indicatorId: string }, UseIndicatorByIdValue>(
    (props) => useIndicatorById(props.indicatorId),
    {
      initialProps,
      wrapper: TestProvidersComponent,
    }
  );

describe('useIndicatorById()', () => {
  type MockedCreateFetchIndicators = jest.MockedFunction<typeof createFetchIndicatorById>;
  let indicatorsQuery: jest.MockedFunction<ReturnType<typeof createFetchIndicatorById>>;

  beforeEach(jest.clearAllMocks);

  beforeEach(() => {
    indicatorsQuery = jest.fn();
    (createFetchIndicatorById as MockedCreateFetchIndicators).mockReturnValue(indicatorsQuery);
  });

  describe('when mounted', () => {
    it('should create and call the indicatorsQuery', async () => {
      indicatorsQuery.mockResolvedValue(indicatorByIdQueryResult);

      const hookResult = renderUseIndicatorById();

      // isLoading should be true
      expect(hookResult.result.current.isLoading).toEqual(true);

      // indicators service and the query should be called just once
      expect(createFetchIndicatorById as MockedCreateFetchIndicators).toHaveBeenCalledTimes(1);
      expect(indicatorsQuery).toHaveBeenCalledTimes(1);

      // isLoading should turn to false eventually
      await hookResult.waitFor(() => !hookResult.result.current.isLoading);
      expect(hookResult.result.current.isLoading).toEqual(false);
    });
  });
});
