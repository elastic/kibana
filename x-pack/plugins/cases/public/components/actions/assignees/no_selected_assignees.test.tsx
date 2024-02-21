/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { NoSelectedAssignees } from './no_selected_assignees';
import { render, screen } from '@testing-library/react';

describe('NoSelectedAssignees', () => {
  it('renders the no matches messages with one selected case correctly', async () => {
    render(<NoSelectedAssignees totalSelectedCases={1} />);

    expect(await screen.findByText('The selected case does not have any assigned users'));
    expect(await screen.findByText('Search to assign users.'));
  });

  it('renders the no matches messages with multiple selected case correctly', async () => {
    render(<NoSelectedAssignees totalSelectedCases={2} />);

    expect(await screen.findByText('The selected cases do not have any assigned users'));
    expect(await screen.findByText('Search to assign users.'));
  });
});
