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

describe('rule_actions_popover', () => {
  const onDeleteMock = jest.fn();
  const onApiKeyUpdateMock = jest.fn();
  const onEnableDisableMock = jest.fn();
  const onRunRuleMock = jest.fn();

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

  it('renders all the buttons', () => {
    const rule = mockRule();
    render(
      <IntlProvider locale="en">
        <RuleActionsPopover
          rule={rule}
          onDelete={onDeleteMock}
          onApiKeyUpdate={onApiKeyUpdateMock}
          canSaveRule={true}
          onEnableDisable={onEnableDisableMock}
          onRunRule={onRunRuleMock}
        />
      </IntlProvider>
    );

    const actionButton = screen.getByTestId('ruleActionsButton');
    expect(actionButton).toBeInTheDocument();
    fireEvent.click(actionButton);
    expect(screen.getByText('Update API key')).toBeInTheDocument();
    expect(screen.getByText('Delete rule')).toBeInTheDocument();
    expect(screen.getByText('Disable')).toBeInTheDocument();
    expect(screen.getByText('Run rule')).toBeInTheDocument();
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
          onEnableDisable={onEnableDisableMock}
          onRunRule={onRunRuleMock}
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

  it('disables the rule', async () => {
    const rule = mockRule();
    render(
      <IntlProvider locale="en">
        <RuleActionsPopover
          rule={rule}
          onDelete={onDeleteMock}
          onApiKeyUpdate={onApiKeyUpdateMock}
          canSaveRule={true}
          onEnableDisable={onEnableDisableMock}
          onRunRule={onRunRuleMock}
        />
      </IntlProvider>
    );

    const actionButton = screen.getByTestId('ruleActionsButton');
    expect(actionButton).toBeInTheDocument();
    fireEvent.click(actionButton);

    const disableButton = screen.getByText('Disable');
    expect(disableButton).toBeInTheDocument();
    fireEvent.click(disableButton);

    expect(onEnableDisableMock).toHaveBeenCalledWith(false);
    await waitFor(() => {
      expect(screen.queryByText('Disable')).not.toBeInTheDocument();
    });
  });
  it('enables the rule', async () => {
    const rule = mockRule({ enabled: false });
    render(
      <IntlProvider locale="en">
        <RuleActionsPopover
          rule={rule}
          onDelete={onDeleteMock}
          onApiKeyUpdate={onApiKeyUpdateMock}
          canSaveRule={true}
          onEnableDisable={onEnableDisableMock}
          onRunRule={onRunRuleMock}
        />
      </IntlProvider>
    );

    const actionButton = screen.getByTestId('ruleActionsButton');
    expect(actionButton).toBeInTheDocument();
    fireEvent.click(actionButton);

    const enableButton = screen.getByText('Enable');
    expect(enableButton).toBeInTheDocument();
    fireEvent.click(enableButton);

    expect(onEnableDisableMock).toHaveBeenCalledWith(true);
    await waitFor(() => {
      expect(screen.queryByText('Disable')).not.toBeInTheDocument();
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
          onEnableDisable={onEnableDisableMock}
          onRunRule={onRunRuleMock}
        />
      </IntlProvider>
    );

    const actionButton = screen.getByTestId('ruleActionsButton');
    expect(actionButton).toBeInTheDocument();
    fireEvent.click(actionButton);

    const deleteButton = screen.getByText('Update API key');
    expect(deleteButton).toBeInTheDocument();
    fireEvent.click(deleteButton);

    expect(onApiKeyUpdateMock).toHaveBeenCalledWith('12345');
    await waitFor(() => {
      expect(screen.queryByText('Update API key')).not.toBeInTheDocument();
    });
  });

  it('calls onRunRule', async () => {
    const rule = mockRule();
    render(
      <IntlProvider locale="en">
        <RuleActionsPopover
          rule={rule}
          onDelete={onDeleteMock}
          onApiKeyUpdate={onApiKeyUpdateMock}
          canSaveRule={true}
          onEnableDisable={onEnableDisableMock}
          onRunRule={onRunRuleMock}
        />
      </IntlProvider>
    );

    const actionButton = screen.getByTestId('ruleActionsButton');
    expect(actionButton).toBeInTheDocument();
    fireEvent.click(actionButton);

    const runRuleButton = screen.getByText('Run rule');
    expect(runRuleButton).toBeInTheDocument();
    fireEvent.click(runRuleButton);

    expect(onRunRuleMock).toHaveBeenCalledWith('12345');
    await waitFor(() => {
      expect(screen.queryByText('Run rule')).not.toBeInTheDocument();
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
          onEnableDisable={onEnableDisableMock}
          onRunRule={onRunRuleMock}
        />
      </IntlProvider>
    );

    const actionButton = screen.getByTestId('ruleActionsButton');
    expect(actionButton).toBeInTheDocument();
    fireEvent.click(actionButton);

    expect(screen.getByText('Delete rule').closest('button')).toBeDisabled();
    expect(screen.getByText('Update API key').closest('button')).toBeDisabled();
    expect(screen.getByText('Disable').closest('button')).toBeDisabled();
    expect(screen.getByText('Run rule').closest('button')).toBeDisabled();
  });
});
