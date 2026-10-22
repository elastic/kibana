/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderInRequestFlyout } from './test_utils';
import { RequestFlyoutLevel } from './request_flyout_level';

jest.mock('./request_flyout_content', () => ({ RequestFlyoutBody: () => <div>body</div> }));

const mockUseRequestFlyoutFooterMenu = jest.fn();
jest.mock('./footer', () => ({
  ACTIONS_BUTTON_LABEL: 'Actions',
  useRequestFlyoutFooterMenu: () => mockUseRequestFlyoutFooterMenu(),
}));

const props = {
  title: 'frontend → postgresql',
  onClose: jest.fn(),
  session: 'start' as const,
  size: 'm' as const,
  childSession: 'inherit' as const,
  historyKey: Symbol('test'),
  'data-test-subj': 'requestFlyout',
};

describe('RequestFlyoutLevel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRequestFlyoutFooterMenu.mockReturnValue([
      { id: 0, items: [{ name: 'Open in APM', href: '/apm' }] },
    ]);
  });

  it('renders the title, the body and the actions of the flyout', () => {
    renderInRequestFlyout(<RequestFlyoutLevel {...props} />);

    expect(screen.getByTestId('requestFlyoutHeader')).toHaveTextContent('frontend → postgresql');
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByTestId('requestFlyoutActionsButton')).toHaveTextContent('Actions');
  });

  it('shows the links of the actions menu', () => {
    renderInRequestFlyout(<RequestFlyoutLevel {...props} />);

    fireEvent.click(screen.getByTestId('requestFlyoutActionsButton'));

    expect(screen.getByRole('menuitem', { name: 'Open in APM' })).toHaveAttribute('href', '/apm');
  });

  it('has no footer when there is no action', () => {
    mockUseRequestFlyoutFooterMenu.mockReturnValue([]);

    renderInRequestFlyout(<RequestFlyoutLevel {...props} />);

    expect(screen.queryByTestId('requestFlyoutActionsButton')).not.toBeInTheDocument();
  });
});
