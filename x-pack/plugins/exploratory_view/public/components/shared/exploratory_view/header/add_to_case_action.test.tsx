/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, forNearestButton } from '../rtl_helpers';
import { fireEvent } from '@testing-library/react';
import { AddToCaseAction } from './add_to_case_action';
import * as useCaseHook from '../hooks/use_add_to_case';
import * as datePicker from '../components/date_range_picker';
import moment from 'moment';
import { noCasesPermissions as mockUseGetCasesPermissions } from '@kbn/observability-shared-plugin/public';
import * as obsHooks from '@kbn/observability-shared-plugin/public/hooks/use_get_user_cases_permissions';

jest.spyOn(obsHooks, 'useGetUserCasesPermissions').mockReturnValue(mockUseGetCasesPermissions());
describe('AddToCaseAction', function () {
  beforeEach(() => {
    jest.spyOn(datePicker, 'parseRelativeDate').mockRestore();
  });

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

  it('should use an empty time-range when timeRanges are empty', async function () {
    const useAddToCaseHook = jest.spyOn(useCaseHook, 'useAddToCase');

    const { getByText } = render(
      <AddToCaseAction lensAttributes={null} timeRange={{ to: '', from: '' }} owner="security" />
    );

    expect(await forNearestButton(getByText)('Add to case')).toBeDisabled();

    expect(useAddToCaseHook).toHaveBeenCalledWith(
      expect.objectContaining({
        lensAttributes: null,
        timeRange: {
          from: '',
          to: '',
        },
        owner: 'security',
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

    expect(core?.cases?.ui.getAllCasesSelectorModal).toHaveBeenCalledTimes(1);
    expect(core?.cases?.ui.getAllCasesSelectorModal).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: ['observability'],
        permissions: {
          all: false,
          create: false,
          read: false,
          update: false,
          delete: false,
          push: false,
          connectors: false,
        },
      })
    );
  });
});
