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
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import userEvent from '@testing-library/user-event';

// FLAKY: https://github.com/elastic/kibana/issues/188488
describe.skip('Case Owner Selection', () => {
  const onOwnerChange = jest.fn();
  const selectedOwner = SECURITY_SOLUTION_OWNER;

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders all options', async () => {
    appMockRender.render(
      <CreateCaseOwnerSelector
        availableOwners={[SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER]}
        isLoading={false}
        onOwnerChange={onOwnerChange}
        selectedOwner={selectedOwner}
      />
    );

    expect(await screen.findByTestId('caseOwnerSelector')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('caseOwnerSuperSelect'));

    const options = await screen.findAllByRole('option');
    expect(options[0]).toHaveTextContent(OWNER_INFO[SECURITY_SOLUTION_OWNER].label);
    expect(options[1]).toHaveTextContent(OWNER_INFO[OBSERVABILITY_OWNER].label);
  });

  it.each([[SECURITY_SOLUTION_OWNER], [OBSERVABILITY_OWNER]])(
    'only displays %s option if available',
    async (available) => {
      appMockRender.render(
        <CreateCaseOwnerSelector
          availableOwners={[available]}
          isLoading={false}
          onOwnerChange={onOwnerChange}
          selectedOwner={available}
        />
      );

      expect(await screen.findByText(OWNER_INFO[available].label)).toBeInTheDocument();

      userEvent.click(await screen.findByTestId('caseOwnerSuperSelect'));

      expect((await screen.findAllByRole('option')).length).toBe(1);
    }
  );

  it('changes the selection', async () => {
    appMockRender.render(
      <CreateCaseOwnerSelector
        availableOwners={[OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER]}
        isLoading={false}
        onOwnerChange={onOwnerChange}
        selectedOwner={selectedOwner}
      />
    );

    expect(await screen.findByText('Security')).toBeInTheDocument();
    expect(screen.queryByText('Observability')).not.toBeInTheDocument();

    userEvent.click(await screen.findByTestId('caseOwnerSuperSelect'));
    userEvent.click(await screen.findByText('Observability'), undefined, {
      skipPointerEventsCheck: true,
    });

    await waitFor(() => {
      // data, isValid
      expect(onOwnerChange).toBeCalledWith('observability');
    });
  });
});
