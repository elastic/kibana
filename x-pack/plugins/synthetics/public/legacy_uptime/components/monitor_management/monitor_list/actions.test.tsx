/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';

import { Actions } from './actions';

describe('<Actions />', () => {
  const onUpdate = jest.fn();

  it('navigates to edit monitor flow on edit pencil', () => {
    render(<Actions id="test-id" name="sample name" onUpdate={onUpdate} monitors={[]} />);

    expect(screen.getByLabelText('Edit monitor')).toHaveAttribute(
      'href',
      '/app/uptime/edit-monitor/dGVzdC1pZA=='
    );
  });
});
