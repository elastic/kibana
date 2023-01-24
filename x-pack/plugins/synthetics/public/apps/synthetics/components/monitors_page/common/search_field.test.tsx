/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import * as URL from '../../../hooks/use_url_params';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../utils/testing/rtl_helpers';
import { SyntheticsUrlParams } from '../../../utils/url_params/get_supported_url_params';
import { SearchField } from './search_field';

describe('SearchField', () => {
  let useUrlParamsSpy: jest.SpyInstance<[URL.GetUrlParams, URL.UpdateUrlParams]>;
  let useGetUrlParamsSpy: jest.SpyInstance<SyntheticsUrlParams>;
  let updateUrlParamsMock: jest.Mock;

  beforeEach(() => {
    useUrlParamsSpy = jest.spyOn(URL, 'useUrlParams');
    useGetUrlParamsSpy = jest.spyOn(URL, 'useGetUrlParams');
    updateUrlParamsMock = jest.fn();

    useUrlParamsSpy.mockImplementation(() => [jest.fn(), updateUrlParamsMock]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('updates url params when searching', async () => {
    const searchInput = 'test input';
    const { getByTestId } = render(<SearchField />);

    fireEvent.change(getByTestId('syntheticsOverviewSearchInput'), {
      target: { value: searchInput },
    });

    await waitFor(() => {
      expect(updateUrlParamsMock).toBeCalledWith({
        query: searchInput,
      });
    });
  });

  it('fills search bar with query', () => {
    const searchInput = 'test input';
    useGetUrlParamsSpy.mockReturnValue({
      query: searchInput,
    } as SyntheticsUrlParams);

    const { getByTestId } = render(<SearchField />);
    const input = getByTestId('syntheticsOverviewSearchInput') as HTMLInputElement;

    expect(input.value).toEqual(searchInput);
  });
});
