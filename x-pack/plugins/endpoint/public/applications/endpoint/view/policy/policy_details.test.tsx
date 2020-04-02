/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createAppRootMockRenderer } from '../../mocks';
import { PolicyDetails } from './policy_details';

describe('Policy Details', () => {
  const { render } = createAppRootMockRenderer();
  render(<PolicyDetails />);

  describe('when displayed with invalid id', () => {
    it.todo('should show error message');
  });
  describe('when displayed with valid id', () => {
    it.todo('should show loader while retrieving data');
    it.todo('should render the view after data is retrieved');
    it.todo('should navigate to list if back to link is clicked');
    it.todo('should display agent stats');
    it.todo('should display cancel button');
    it.todo('should redirect to policy list when cancel button is clicked');
    it.todo('should display save button');
  });
  describe('when the save button is clicked', () => {
    it.todo('should show a modal confirmation');
    it.todo('should show info callout if policy is in use');
    it.todo('should hide dialog when save and deploy button is clicked');
    it.todo('should close dialog if cancel button is clicked');
    it.todo('should show a success notification toast if update succeeds');
    it.todo('should show an error notification toast if update fails');
  });
});
