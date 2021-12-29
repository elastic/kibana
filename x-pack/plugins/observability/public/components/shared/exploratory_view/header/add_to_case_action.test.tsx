/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../rtl_helpers';
import { fireEvent } from '@testing-library/dom';
import { AddToCaseAction } from './add_to_case_action';
import * as useCaseHook from '../hooks/use_add_to_case';
import * as datePicker from '../components/date_range_picker';
import moment from 'moment';

describe('AddToCaseAction', function () {
  it('should render properly', async function () {
    const { findByText } = render(
      <AddToCaseAction
        lensAttributes={{ title: 'Performance distribution' } as any}
        timeRange={{ to: 'now', from: 'now-5m' }}
      />
    );
    expect(await findByText('Add to case')).toBeInTheDocument();
  });

  it('should parse relative data to the useAddToCase hook', async function () {
    const useAddToCaseHook = jest.spyOn(useCaseHook, 'useAddToCase');
    jest.spyOn(datePicker, 'parseRelativeDate').mockReturnValue(moment('2021-11-10T10:52:06.091Z'));

    const { findByText } = render(
      <AddToCaseAction
        lensAttributes={{ title: 'Performance distribution' } as any}
        timeRange={{ to: 'now', from: 'now-5m' }}
      />
    );
    expect(await findByText('Add to case')).toBeInTheDocument();

    expect(useAddToCaseHook).toHaveBeenCalledWith(
      expect.objectContaining({
        lensAttributes: {
          title: 'Performance distribution',
        },
        timeRange: {
          from: '2021-11-10T10:52:06.091Z',
          to: '2021-11-10T10:52:06.091Z',
        },
      })
    );
  });

  it('should be able to click add to case button', async function () {
    const initSeries = {
      data: [
        {
          name: 'test-series',
          dataType: 'synthetics' as const,
          reportType: 'kpi-over-time' as const,
          breakdown: 'monitor.status',
          time: { from: 'now-15m', to: 'now' },
        },
      ],
    };

    const { findByText, core } = render(
      <AddToCaseAction
        lensAttributes={{ title: 'Performance distribution' } as any}
        timeRange={{ to: 'now', from: 'now-5m' }}
      />,
      { initSeries }
    );
    fireEvent.click(await findByText('Add to case'));

    expect(core?.cases?.getAllCasesSelectorModal).toHaveBeenCalledTimes(1);
    expect(core?.cases?.getAllCasesSelectorModal).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: ['observability'],
        userCanCrud: true,
      })
    );
  });
});
