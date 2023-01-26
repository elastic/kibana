/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { wait } from '@testing-library/user-event/dist/utils';
import React from 'react';

import { emptySloList } from '../../../fixtures/slo/slo';
import { useFetchSloList } from '../../../hooks/slo/use_fetch_slo_list';
import { render } from '../../../utils/test_helper';
import { SloSelector } from './slo_selector';

jest.mock('../../../hooks/slo/use_fetch_slo_list');

const useFetchSloListMock = useFetchSloList as jest.Mock;

describe('SLO Selector', () => {
  const onSelectedSpy = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    useFetchSloListMock.mockReturnValue({ loading: true, sloList: emptySloList });
  });

  it('fetches SLOs asynchronously', async () => {
    render(<SloSelector onSelected={onSelectedSpy} />);

    expect(screen.getByTestId('sloSelector')).toBeTruthy();
    expect(useFetchSloListMock).toHaveBeenCalledWith({ name: '', refetch: false });
  });

  it('searches SLOs when typing', async () => {
    render(<SloSelector onSelected={onSelectedSpy} />);

    const input = screen.getByTestId('comboBoxInput');
    await act(async () => {
      await userEvent.type(input, 'latency', { delay: 1 });
      await wait(310); // debounce delay
    });

    expect(useFetchSloListMock).toHaveBeenCalledWith({ name: 'latency', refetch: false });
  });
});
