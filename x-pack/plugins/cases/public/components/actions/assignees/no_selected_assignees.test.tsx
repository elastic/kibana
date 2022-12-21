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
  it('renders the no matches messages', () => {
    render(<NoSelectedAssignees />);

    expect(screen.getByText('The selected cases do not have any assigned users'));
    expect(screen.getByText('Search to assign users.'));
  });
});
