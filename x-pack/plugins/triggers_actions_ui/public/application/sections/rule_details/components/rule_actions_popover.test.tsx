/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { RuleActionsPopover } from './rule_actions_popover';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Rule } from '../../../..';
import { afterEach } from 'jest-circus';

describe('rule_actions_popover', () => {
  const onDeleteMock = jest.fn();
  const onApiKeyUpdateMock = jest.fn();

  function mockRule(overloads: Partial<Rule> = {}): Rule {
    return {
      id: '12345',
      enabled: true,
      name: `rule-12345`,
      tags: [],
      ruleTypeId: '.noop',
      consumer: 'consumer',
      schedule: { interval: '1m' },
      actions: [],
      params: {},
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      apiKeyOwner: null,
      throttle: null,
      notifyWhen: null,
      muteAll: false,
      mutedInstanceIds: [],
      executionStatus: {
        status: 'unknown',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      },
      ...overloads,
    };
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders all the buttons', () => {
    const rule = mockRule();
    render(
      <IntlProvider locale="en">
        <RuleActionsPopover
          rule={rule}
          onDelete={onDeleteMock}
          onApiKeyUpdate={onApiKeyUpdateMock}
          canSaveRule={true}
        />
      </IntlProvider>
    );

    const actionButton = screen.getByTestId('ruleActionsButton');
    expect(actionButton).toBeInTheDocument();
    fireEvent.click(actionButton);
    expect(screen.getByText('Update API Key')).toBeInTheDocument();
    expect(screen.getByText('Delete rule')).toBeInTheDocument();
  });

  it('calls onDelete', async () => {
    const rule = mockRule();
    render(
      <IntlProvider locale="en">
        <RuleActionsPopover
          rule={rule}
          onDelete={onDeleteMock}
          onApiKeyUpdate={onApiKeyUpdateMock}
          canSaveRule={true}
        />
      </IntlProvider>
    );

    const actionButton = screen.getByTestId('ruleActionsButton');
    expect(actionButton).toBeInTheDocument();
    fireEvent.click(actionButton);

    const deleteButton = screen.getByText('Delete rule');
    expect(deleteButton).toBeInTheDocument();
    fireEvent.click(deleteButton);

    expect(onDeleteMock).toHaveBeenCalledWith('12345');
    await waitFor(() => {
      expect(screen.queryByText('Delete rule')).not.toBeInTheDocument();
    });
  });

  it('calls onApiKeyUpdate', async () => {
    const rule = mockRule();
    render(
      <IntlProvider locale="en">
        <RuleActionsPopover
          rule={rule}
          onDelete={onDeleteMock}
          onApiKeyUpdate={onApiKeyUpdateMock}
          canSaveRule={true}
        />
      </IntlProvider>
    );

    const actionButton = screen.getByTestId('ruleActionsButton');
    expect(actionButton).toBeInTheDocument();
    fireEvent.click(actionButton);

    const deleteButton = screen.getByText('Update API Key');
    expect(deleteButton).toBeInTheDocument();
    fireEvent.click(deleteButton);

    expect(onApiKeyUpdateMock).toHaveBeenCalledWith('12345');
    await waitFor(() => {
      expect(screen.queryByText('Update API Key')).not.toBeInTheDocument();
    });
  });

  it('disables buttons when the user does not have enough permission', async () => {
    const rule = mockRule();
    render(
      <IntlProvider locale="en">
        <RuleActionsPopover
          rule={rule}
          onDelete={onDeleteMock}
          onApiKeyUpdate={onApiKeyUpdateMock}
          canSaveRule={false}
        />
      </IntlProvider>
    );

    const actionButton = screen.getByTestId('ruleActionsButton');
    expect(actionButton).toBeInTheDocument();
    fireEvent.click(actionButton);

    expect(screen.getByText('Delete rule').closest('button')).toBeDisabled();
    expect(screen.getByText('Update API Key').closest('button')).toBeDisabled();
  });
});
