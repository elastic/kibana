/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StatusBadge } from './status_badge';
import { render } from '../../lib/helper/rtl_helpers';

describe('StatusBadge', () => {
  it('displays success message', () => {
    const { getByText } = render(<StatusBadge status="succeeded" stepNo={1} />);

    expect(getByText('1.'));
    expect(getByText('Succeeded'));
  });

  it('displays failed message', () => {
    const { getByText } = render(<StatusBadge status="failed" stepNo={2} />);

    expect(getByText('2.'));
    expect(getByText('Failed'));
  });

  it('displays skipped message', () => {
    const { getByText } = render(<StatusBadge status="skipped" stepNo={3} />);

    expect(getByText('3.'));
    expect(getByText('Skipped'));
  });

  it('hides the step number on mobile', () => {
    const { queryByText } = render(<StatusBadge status="skipped" stepNo={3} isMobile />);
    expect(queryByText('3.')).not.toBeInTheDocument();
    expect(queryByText('Skipped')).toBeInTheDocument();
  });
});
