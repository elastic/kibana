/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as URL from '../../../../hooks/use_url_params';
import { fireEvent } from '@testing-library/react';
import { render } from '../../../../utils/testing/rtl_helpers';
import { SyntheticsUrlParams } from '../../../../utils/url_params/get_supported_url_params';
import { QuickFilters } from './quick_filters';

describe('QuickFilters', () => {
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

  it.each(['Up', 'Down', 'Disabled'])('updates url params when filter is clicked', (status) => {
    const { getByText } = render(<QuickFilters />);

    fireEvent.click(getByText(status));

    expect(updateUrlParamsMock).toBeCalledWith({
      statusFilter: status.toLowerCase(),
    });
  });

  it.each(['Up', 'Down', 'Disabled'])('deselects filer', (status) => {
    useGetUrlParamsSpy.mockReturnValue({
      statusFilter: status.toLowerCase(),
    } as SyntheticsUrlParams);

    const { getByText } = render(<QuickFilters />);

    fireEvent.click(getByText(status));

    expect(updateUrlParamsMock).toBeCalledWith({
      statusFilter: undefined,
    });
  });
});
