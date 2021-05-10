/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mockUrlStorage, render } from '../rtl_helpers';
import { ExploratoryViewHeader } from './header';
import { fireEvent } from '@testing-library/dom';

describe('ExploratoryViewHeader', function () {
  it('should render properly', function () {
    const { getByText } = render(
      <ExploratoryViewHeader
        seriesId={'dummy-series'}
        lensAttributes={{ title: 'Performance distribution' } as any}
      />
    );
    getByText('Open in Lens');
  });

  it('should be able to click open in lens', function () {
    mockUrlStorage({
      data: {
        'uptime-pings-histogram': {
          dataType: 'synthetics',
          reportType: 'upp',
          breakdown: 'monitor.status',
          time: { from: 'now-15m', to: 'now' },
        },
      },
    });

    const { getByText, core } = render(
      <ExploratoryViewHeader
        seriesId={'dummy-series'}
        lensAttributes={{ title: 'Performance distribution' } as any}
      />
    );
    fireEvent.click(getByText('Open in Lens'));

    expect(core?.lens?.navigateToPrefilledEditor).toHaveBeenCalledTimes(1);
    expect(core?.lens?.navigateToPrefilledEditor).toHaveBeenCalledWith(
      {
        attributes: { title: 'Performance distribution' },
        id: '',
        timeRange: {
          from: 'now-15m',
          to: 'now',
        },
      },
      true
    );
  });
});
