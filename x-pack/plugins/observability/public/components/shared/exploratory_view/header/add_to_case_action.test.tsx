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
        createCaseNavigation: expect.objectContaining({ href: '/app/observability/cases/create' }),
        owner: ['observability'],
        userCanCrud: true,
      })
    );
  });
});
