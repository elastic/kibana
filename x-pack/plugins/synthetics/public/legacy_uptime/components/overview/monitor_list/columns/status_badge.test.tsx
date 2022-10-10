/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { StatusBadge } from './status_badge';
import { render } from '../../../../lib/helper/rtl_helpers';

describe('<StatusBadge />', () => {
  it('render no error for up status', () => {
    render(<StatusBadge status="up" monitorType="browser" />);

    expect(screen.getByText('Up')).toBeInTheDocument();
  });

  it('renders errors for downs state', () => {
    render(
      <StatusBadge
        status="down"
        monitorType="browser"
        summaryError={{ message: 'journey did not run' }}
      />
    );

    expect(screen.getByText('Down')).toBeInTheDocument();
    expect(
      screen.getByLabelText('journey did not run. Click for more details.')
    ).toBeInTheDocument();
  });

  it('renders errors for downs state for http monitor', () => {
    render(
      <StatusBadge
        status="down"
        monitorType="http"
        summaryError={{ message: 'journey did not run' }}
      />
    );

    expect(screen.getByText('Down')).toBeInTheDocument();
    expect(screen.getByLabelText('journey did not run')).toBeInTheDocument();
  });
});
