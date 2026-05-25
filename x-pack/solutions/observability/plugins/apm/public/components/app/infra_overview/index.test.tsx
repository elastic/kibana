/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { renderWithContext } from '../../../utils/test_helpers';
import { InfraOverview } from '.';

jest.mock('./infra_tabs', () => ({
  InfraTabs: () => <div data-test-subj="apmInfraTabs" />,
}));

jest.mock('./infrastructure_tab_help_popover', () => ({
  InfrastructureTabHelpPopover: () => <div data-test-subj="apmInfrastructureTabHelpPopover" />,
}));

describe('InfraOverview', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the help popover above and outside the infrastructure panel', () => {
    renderWithContext(<InfraOverview />);

    const helpPopover = screen.getByTestId('apmInfrastructureTabHelpPopover');
    const panel = screen.getByTestId('apmInfrastructureTabPanel');

    expect(panel).not.toContainElement(helpPopover);
    expect(helpPopover.compareDocumentPosition(panel)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
