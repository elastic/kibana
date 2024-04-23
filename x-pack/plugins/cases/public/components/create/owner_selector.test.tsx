/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';

import { SECURITY_SOLUTION_OWNER } from '../../../common';
import { OBSERVABILITY_OWNER, OWNER_INFO } from '../../../common/constants';
import { CreateCaseOwnerSelector } from './owner_selector';
import { FormTestComponent } from '../../common/test_utils';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import userEvent from '@testing-library/user-event';

describe('Case Owner Selection', () => {
  const onSubmit = jest.fn();
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CreateCaseOwnerSelector availableOwners={[SECURITY_SOLUTION_OWNER]} isLoading={false} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseOwnerSelector')).toBeInTheDocument();
  });

  it.each([
    [OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER],
    [SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER],
  ])('disables %s button if user only has %j', async (disabledButton, permission) => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CreateCaseOwnerSelector availableOwners={[permission]} isLoading={false} />
      </FormTestComponent>
    );

    expect(await screen.findByLabelText(OWNER_INFO[disabledButton].label)).toBeDisabled();
    expect(await screen.findByLabelText(OWNER_INFO[permission].label)).not.toBeDisabled();
  });

  it('defaults to security Solution', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CreateCaseOwnerSelector
          availableOwners={[OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER]}
          isLoading={false}
        />
      </FormTestComponent>
    );

    expect(await screen.findByLabelText('Observability')).not.toBeChecked();
    expect(await screen.findByLabelText('Security')).toBeChecked();

    userEvent.click(await screen.findByTestId('form-test-component-submit-button'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({ selectedOwner: 'securitySolution' }, true);
    });
  });

  it('defaults to security Solution with empty owners', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CreateCaseOwnerSelector availableOwners={[]} isLoading={false} />
      </FormTestComponent>
    );

    expect(await screen.findByLabelText('Observability')).not.toBeChecked();
    expect(await screen.findByLabelText('Security')).toBeChecked();

    userEvent.click(await screen.findByTestId('form-test-component-submit-button'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({ selectedOwner: 'securitySolution' }, true);
    });
  });

  it('changes the selection', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CreateCaseOwnerSelector
          availableOwners={[OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER]}
          isLoading={false}
        />
      </FormTestComponent>
    );

    expect(await screen.findByLabelText('Security')).toBeChecked();
    expect(await screen.findByLabelText('Observability')).not.toBeChecked();

    userEvent.click(await screen.findByLabelText('Observability'));

    expect(await screen.findByLabelText('Observability')).toBeChecked();
    expect(await screen.findByLabelText('Security')).not.toBeChecked();

    userEvent.click(await screen.findByTestId('form-test-component-submit-button'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({ selectedOwner: 'observability' }, true);
    });
  });
});
