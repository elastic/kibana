/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import DefaultAlertActions from './default_alert_actions';
import { render, screen } from '@testing-library/react';
import type { AlertActionsProps } from '../../../../types';

jest.mock('../../../hooks/use_load_rule_types_query', () => ({
  useLoadRuleTypesQuery: jest.fn(),
}));
jest.mock('./view_rule_details_alert_action', () => {
  return {
    ViewRuleDetailsAlertAction: () => (
      <div data-test-subj="viewRuleDetailsAlertAction">{'ViewRuleDetailsAlertAction'}</div>
    ),
  };
});
jest.mock('./view_alert_details_alert_action', () => {
  return {
    ViewAlertDetailsAlertAction: () => (
      <div data-test-subj="viewAlertDetailsAlertAction">{'ViewAlertDetailsAlertAction'}</div>
    ),
  };
});
jest.mock('./mute_alert_action', () => {
  return { MuteAlertAction: () => <div data-test-subj="muteAlertAction">{'MuteAlertAction'}</div> };
});
jest.mock('./mark_as_untracked_alert_action', () => {
  return {
    MarkAsUntrackedAlertAction: () => (
      <div data-test-subj="markAsUntrackedAlertAction">{'MarkAsUntrackedAlertAction'}</div>
    ),
  };
});

const { useLoadRuleTypesQuery } = jest.requireMock('../../../hooks/use_load_rule_types_query');
const props = { alert: {}, refresh: jest.fn() } as unknown as AlertActionsProps;

describe('DefaultAlertActions component', () => {
  it('should show "Mute" and "Marked as untracted" option', async () => {
    useLoadRuleTypesQuery.mockReturnValue({ authorizedToCreateAnyRules: true });

    render(<DefaultAlertActions {...props} />);

    expect(await screen.findByText('MuteAlertAction')).toBeInTheDocument();
    expect(await screen.findByText('MarkAsUntrackedAlertAction')).toBeInTheDocument();
  });

  it('should hide "Mute" and "Marked as untracted" option', async () => {
    useLoadRuleTypesQuery.mockReturnValue({ authorizedToCreateAnyRules: false });

    render(<DefaultAlertActions {...props} />);

    expect(screen.queryByText('MuteAlertAction')).not.toBeInTheDocument();
    expect(screen.queryByText('MarkAsUntrackedAlertAction')).not.toBeInTheDocument();
  });
});
