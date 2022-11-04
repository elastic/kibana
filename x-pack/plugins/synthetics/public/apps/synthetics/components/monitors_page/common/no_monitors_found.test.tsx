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
import { NoMonitorsFound } from './no_monitors_found';

describe('NoMonitorsFound', () => {
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

  it('clears url params', async () => {
    const { getByText } = render(<NoMonitorsFound />);

    fireEvent.click(getByText('Clear filters'));

    await waitFor(() => {
      expect(updateUrlParamsMock).toBeCalledWith(null);
    });
  });
});
