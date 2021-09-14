/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { DocLinkForBody } from './doc_link_body';

describe('PingListExpandedRow', () => {
  it('renders expected elements for valid props', () => {
    render(<DocLinkForBody />);

    expect(screen.getByText(/Body not recorded. Read our/));
    expect(
      screen.getByRole('link', { name: 'docs External link (opens in a new tab or window)' })
    ).toBeInTheDocument();
    expect(screen.getByText(/for more information on recording response bodies./));
  });
});
