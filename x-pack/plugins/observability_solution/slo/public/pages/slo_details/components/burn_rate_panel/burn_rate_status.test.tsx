/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { render } from '../../../../utils/test_helper';
import { DEFAULT_BURN_RATE_WINDOWS } from '../../hooks/use_fetch_burn_rate_windows';
import { BurnRateStatus } from './burn_rate_status';

describe('BurnRateStatus', () => {
  it('displays loading spinner when burn rates are being fetched', async () => {
    render(
      <BurnRateStatus
        isLoading={true}
        shortWindowBurnRate={0}
        longWindowBurnRate={0}
        selectedWindow={DEFAULT_BURN_RATE_WINDOWS[0]}
      />
    );

    expect(screen.queryByTestId('loadingSpinner')).toBeDefined();
  });

  it("displays the 'breached' status", async () => {
    render(
      <BurnRateStatus
        isLoading={false}
        shortWindowBurnRate={18.45}
        longWindowBurnRate={22.32}
        selectedWindow={DEFAULT_BURN_RATE_WINDOWS[0]}
      />
    );

    expect(screen.queryByTestId('title')).toHaveTextContent('Breached');
    expect(screen.queryByTestId('description')).toHaveTextContent(
      'The 1h burn rate is 22.32x and the 5m burn rate is 18.45x.'
    );
  });

  it("displays the 'recovering' status", async () => {
    render(
      <BurnRateStatus
        isLoading={false}
        shortWindowBurnRate={1.2}
        longWindowBurnRate={22.32}
        selectedWindow={DEFAULT_BURN_RATE_WINDOWS[0]}
      />
    );

    expect(screen.queryByTestId('title')).toHaveTextContent('Recovering');
    expect(screen.queryByTestId('description')).toHaveTextContent(
      'The 1h burn rate is 22.32x and the 5m burn rate is 1.2x.'
    );
  });

  it("displays the 'Increasing' status", async () => {
    render(
      <BurnRateStatus
        isLoading={false}
        shortWindowBurnRate={18.45}
        longWindowBurnRate={1.32}
        selectedWindow={DEFAULT_BURN_RATE_WINDOWS[0]}
      />
    );

    expect(screen.queryByTestId('title')).toHaveTextContent('Increasing');
    expect(screen.queryByTestId('description')).toHaveTextContent(
      'The 1h burn rate is 1.32x and the 5m burn rate is 18.45x.'
    );
  });

  it("displays the 'Acceptable' status", async () => {
    render(
      <BurnRateStatus
        isLoading={false}
        shortWindowBurnRate={1.45}
        longWindowBurnRate={2.32}
        selectedWindow={DEFAULT_BURN_RATE_WINDOWS[0]}
      />
    );

    expect(screen.queryByTestId('title')).toHaveTextContent('Acceptable value');
    expect(screen.queryByTestId('description')).toHaveTextContent(
      'The 1h burn rate is 2.32x and the 5m burn rate is 1.45x.'
    );
  });
});
