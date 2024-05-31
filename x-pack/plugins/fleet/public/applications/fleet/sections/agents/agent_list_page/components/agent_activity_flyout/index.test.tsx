/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, fireEvent } from '@testing-library/react';
// eslint-disable-next-line @kbn/eslint/module_migration
import { IntlProvider } from 'react-intl';

import { useActionStatus } from '../../hooks';
import { useGetAgentPolicies, useStartServices } from '../../../../../hooks';

import { AgentActivityFlyout } from '.';

jest.mock('../../hooks');
jest.mock('../../../../../hooks');

jest.mock('@kbn/shared-ux-link-redirect-app', () => ({
  RedirectAppLinks: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseActionStatus = useActionStatus as jest.Mock;
const mockUseGetAgentPolicies = useGetAgentPolicies as jest.Mock;
const mockUseStartServices = useStartServices as jest.Mock;

describe('AgentActivityFlyout', () => {
  const mockOnClose = jest.fn();
  const mockOnAbortSuccess = jest.fn();
  const mockAbortUpgrade = jest.fn();
  const mockSetSearch = jest.fn();
  const mockSetSelectedStatus = jest.fn();

  const component = (refreshAgentActivity: boolean = false) => (
    <IntlProvider timeZone="UTC" locale="en">
      <AgentActivityFlyout
        onClose={mockOnClose}
        onAbortSuccess={mockOnAbortSuccess}
        refreshAgentActivity={refreshAgentActivity}
        setSearch={mockSetSearch}
        setSelectedStatus={mockSetSelectedStatus}
        agentPolicies={[]}
      />
    </IntlProvider>
  );

  beforeEach(() => {
    mockOnClose.mockReset();
    mockOnAbortSuccess.mockReset();
    mockAbortUpgrade.mockReset();
    mockUseActionStatus.mockReset();
    mockSetSearch.mockReset();
    mockSetSelectedStatus.mockReset();
    mockUseGetAgentPolicies.mockReturnValue({
      data: {
        items: [
          { id: 'policy1', name: 'Policy 1' },
          { id: 'policy2', name: 'Policy 2' },
        ],
      },
    });
    mockUseStartServices.mockReturnValue({
      docLinks: { links: { fleet: { upgradeElasticAgent: 'https://elastic.co' } } },
      application: { navigateToUrl: jest.fn() },
      http: { basePath: { prepend: jest.fn() } },
    });
  });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2022-09-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render a loader while actions are loading and then render actions', async () => {
    const mockActionStatuses = [
      {
        actionId: 'action2',
        nbAgentsActionCreated: 5,
        nbAgentsAck: 0,
        version: '8.5.0',
        startTime: '2022-09-15T10:00:00.000Z',
        type: 'UPGRADE',
        nbAgentsActioned: 5,
        status: 'IN_PROGRESS',
        expiration: '2099-09-16T10:00:00.000Z',
        creationTime: '2022-09-15T10:00:00.000Z',
        nbAgentsFailed: 0,
        hasRolloutPeriod: true,
      },
    ];
    mockUseActionStatus
      .mockReturnValueOnce({
        currentActions: mockActionStatuses,
        abortUpgrade: mockAbortUpgrade,
        isFirstLoading: true,
      })
      .mockReturnValueOnce({
        currentActions: mockActionStatuses,
        abortUpgrade: mockAbortUpgrade,
        isFirstLoading: false,
      });

    const result = render(component());

    expect(result.getByText('Agent activity')).toBeInTheDocument();
    expect(result.queryByTestId('loading')).toBeInTheDocument();
    expect(result.queryByTestId('upgradeInProgressTitle')).not.toBeInTheDocument();

    result.rerender(component());
    expect(result.queryByTestId('loading')).not.toBeInTheDocument();
    expect(result.queryByTestId('upgradeInProgressTitle')).toBeInTheDocument();
  });

  it('should render an empty state after loading if there are no actions', () => {
    mockUseActionStatus.mockReturnValue({
      currentActions: [],
      abortUpgrade: mockAbortUpgrade,
      isFirstLoading: false,
    });
    const result = render(component());

    expect(result.queryByText('No activity to display')).toBeInTheDocument();
  });

  it('should render agent activity for in progress upgrade', async () => {
    const mockActionStatuses = [
      {
        actionId: 'action2',
        nbAgentsActionCreated: 5,
        nbAgentsAck: 0,
        version: '8.5.0',
        startTime: '2022-09-15T10:00:00.000Z',
        type: 'UPGRADE',
        nbAgentsActioned: 5,
        status: 'IN_PROGRESS',
        expiration: '2099-09-16T10:00:00.000Z',
        creationTime: '2022-09-15T10:00:00.000Z',
        nbAgentsFailed: 0,
        hasRolloutPeriod: true,
      },
    ];
    mockUseActionStatus.mockReturnValue({
      currentActions: mockActionStatuses,
      abortUpgrade: mockAbortUpgrade,
      isFirstLoading: false,
    });
    const result = render(component());

    expect(result.getByText('Agent activity')).toBeInTheDocument();

    expect(
      result.container.querySelector('[data-test-subj="upgradeInProgressTitle"]')!.textContent
    ).toEqual('Upgrading 5 agents to version 8.5.0');
    // compare without whitespace, &nbsp; doesn't match
    expect(
      result.container
        .querySelector('[data-test-subj="upgradeInProgressDescription"]')!
        .textContent?.replace(/\s/g, '')
    ).toContain('Started on Sep 15, 2022 10:00 AM. Learn more'.replace(/\s/g, ''));

    act(() => {
      fireEvent.click(result.getByText('Cancel'));
    });

    expect(mockAbortUpgrade).toHaveBeenCalled();
  });

  it('should not render cancel button if the upgrade is set to happen immediately', () => {
    const mockActionStatuses = [
      {
        actionId: 'action2',
        nbAgentsActionCreated: 5,
        nbAgentsAck: 0,
        version: '8.5.0',
        startTime: '2022-09-15T10:00:00.000Z',
        type: 'UPGRADE',
        nbAgentsActioned: 5,
        status: 'IN_PROGRESS',
        expiration: '2099-09-16T10:00:00.000Z',
        creationTime: '2022-09-15T10:00:00.000Z',
        nbAgentsFailed: 0,
        hasRolloutPeriod: false,
      },
    ];
    mockUseActionStatus.mockReturnValue({
      currentActions: mockActionStatuses,
      abortUpgrade: mockAbortUpgrade,
      isFirstLoading: false,
    });
    const result = render(component());

    expect(result.getByText('Agent activity')).toBeInTheDocument();

    expect(
      result.container.querySelector('[data-test-subj="upgradeInProgressTitle"]')!.textContent
    ).toEqual('Upgrading 5 agents to version 8.5.0');
    // compare without whitespace, &nbsp; doesn't match
    expect(
      result.container
        .querySelector('[data-test-subj="upgradeInProgressDescription"]')!
        .textContent?.replace(/\s/g, '')
    ).toContain('Started on Sep 15, 2022 10:00 AM. Learn more'.replace(/\s/g, ''));

    expect(result.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('should render agent activity for scheduled upgrade', () => {
    const mockActionStatuses = [
      {
        actionId: 'action2',
        nbAgentsActionCreated: 5,
        nbAgentsAck: 0,
        version: '8.5.0',
        startTime: '2022-09-16T10:00:00.000Z',
        type: 'UPGRADE',
        nbAgentsActioned: 5,
        status: 'IN_PROGRESS',
        expiration: '2099-09-17T10:00:00.000Z',
        creationTime: '2022-09-15T10:00:00.000Z',
        nbAgentsFailed: 0,
      },
    ];
    mockUseActionStatus.mockReturnValue({
      currentActions: mockActionStatuses,
      abortUpgrade: mockAbortUpgrade,
      isFirstLoading: false,
    });
    const result = render(component());

    expect(result.getByText('Agent activity')).toBeInTheDocument();

    expect(
      result.container.querySelector('[data-test-subj="upgradeInProgressTitle"]')!.textContent
    ).toEqual('5 agents scheduled to upgrade to version 8.5.0');
    expect(
      result.container
        .querySelector('[data-test-subj="upgradeInProgressDescription"]')!
        .textContent?.replace(/\s/g, '')
    ).toContain('Scheduled for Sep 16, 2022 10:00 AM. Learn more'.replace(/\s/g, ''));

    act(() => {
      fireEvent.click(result.getByText('Cancel'));
    });

    expect(mockAbortUpgrade).toHaveBeenCalled();
  });

  it('should render agent activity for complete upgrade', () => {
    const mockActionStatuses = [
      {
        actionId: 'action3',
        nbAgentsActionCreated: 2,
        nbAgentsAck: 2,
        type: 'UPGRADE',
        nbAgentsActioned: 2,
        status: 'COMPLETE',
        expiration: '2099-09-16T10:00:00.000Z',
        creationTime: '2022-09-15T10:00:00.000Z',
        nbAgentsFailed: 0,
        completionTime: '2022-09-15T12:00:00.000Z',
      },
    ];
    mockUseActionStatus.mockReturnValue({
      currentActions: mockActionStatuses,
      abortUpgrade: mockAbortUpgrade,
      isFirstLoading: false,
    });
    const result = render(component());

    expect(result.container.querySelector('[data-test-subj="statusTitle"]')!.textContent).toEqual(
      '2 agents upgraded'
    );
    expect(
      result.container
        .querySelector('[data-test-subj="statusDescription"]')!
        .textContent?.replace(/\s/g, '')
    ).toContain('Completed Sep 15, 2022 12:00 PM'.replace(/\s/g, ''));
  });

  it('should render agent activity for rollout passed upgrade', () => {
    const mockActionStatuses = [
      {
        actionId: 'action3',
        nbAgentsActionCreated: 2,
        nbAgentsAck: 1,
        type: 'UPGRADE',
        nbAgentsActioned: 2,
        status: 'ROLLOUT_PASSED',
        creationTime: '2022-09-15T10:00:00.000Z',
        nbAgentsFailed: 0,
        completionTime: '2022-09-15T12:00:00.000Z',
      },
    ];
    mockUseActionStatus.mockReturnValue({
      currentActions: mockActionStatuses,
      abortUpgrade: mockAbortUpgrade,
      isFirstLoading: false,
    });
    const result = render(component());

    expect(result.container.querySelector('[data-test-subj="statusTitle"]')!.textContent).toEqual(
      '1 of 2 agents upgraded, 1 agent(s) offline during the rollout period'
    );
    expect(
      result.container
        .querySelector('[data-test-subj="statusDescription"]')!
        .textContent?.replace(/\s/g, '')
    ).toContain('Completed Sep 15, 2022 12:00 PM'.replace(/\s/g, ''));
  });

  it('should render agent activity for rollout passed upgrade with failed', () => {
    const mockActionStatuses = [
      {
        actionId: 'action3',
        nbAgentsActionCreated: 2,
        nbAgentsAck: 1,
        type: 'UPGRADE',
        nbAgentsActioned: 2,
        status: 'ROLLOUT_PASSED',
        creationTime: '2022-09-15T10:00:00.000Z',
        nbAgentsFailed: 1,
        completionTime: '2022-09-15T12:00:00.000Z',
      },
    ];
    mockUseActionStatus.mockReturnValue({
      currentActions: mockActionStatuses,
      abortUpgrade: mockAbortUpgrade,
      isFirstLoading: false,
    });
    const result = render(component());

    expect(result.container.querySelector('[data-test-subj="statusTitle"]')!.textContent).toEqual(
      '1 of 2 agents upgraded, 1 agent(s) offline during the rollout period'
    );
    expect(
      result.container
        .querySelector('[data-test-subj="statusDescription"]')!
        .textContent?.replace(/\s/g, '')
    ).toContain(
      'A problem occurred during this operation. Started on Sep 15, 2022 10:00 AM.'.replace(
        /\s/g,
        ''
      )
    );
  });

  it('should render agent activity for expired unenroll', () => {
    const mockActionStatuses = [
      {
        actionId: 'action4',
        nbAgentsActionCreated: 3,
        nbAgentsAck: 0,
        type: 'UNENROLL',
        nbAgentsActioned: 3,
        status: 'EXPIRED',
        expiration: '2022-09-14T10:00:00.000Z',
        creationTime: '2022-09-15T10:00:00.000Z',
        nbAgentsFailed: 0,
      },
    ];
    mockUseActionStatus.mockReturnValue({
      currentActions: mockActionStatuses,
      abortUpgrade: mockAbortUpgrade,
      isFirstLoading: false,
    });
    const result = render(component());

    expect(result.container.querySelector('[data-test-subj="statusTitle"]')!.textContent).toEqual(
      'Agent unenrollment expired'
    );
    expect(
      result.container
        .querySelector('[data-test-subj="statusDescription"]')!
        .textContent?.replace(/\s/g, '')
    ).toContain('Expired on Sep 14, 2022 10:00 AM'.replace(/\s/g, ''));
  });

  it('should render agent activity for cancelled upgrade', () => {
    const mockActionStatuses = [
      {
        actionId: 'action5',
        nbAgentsActionCreated: 3,
        nbAgentsAck: 0,
        startTime: '2022-09-15T10:00:00.000Z',
        type: 'UPGRADE',
        nbAgentsActioned: 3,
        status: 'CANCELLED',
        expiration: '2099-09-16T10:00:00.000Z',
        creationTime: '2022-09-15T10:00:00.000Z',
        nbAgentsFailed: 0,
        cancellationTime: '2022-09-15T11:00:00.000Z',
      },
    ];
    mockUseActionStatus.mockReturnValue({
      currentActions: mockActionStatuses,
      abortUpgrade: mockAbortUpgrade,
      isFirstLoading: false,
    });
    const result = render(component());

    expect(result.container.querySelector('[data-test-subj="statusTitle"]')!.textContent).toEqual(
      'Agent upgrade cancelled'
    );
    expect(
      result.container
        .querySelector('[data-test-subj="statusDescription"]')!
        .textContent?.replace(/\s/g, '')
    ).toContain('Cancelled on Sep 15, 2022 11:00 AM'.replace(/\s/g, ''));
  });

  it('should render agent activity for failed reassign', () => {
    const mockActionStatuses = [
      {
        actionId: 'action7',
        nbAgentsActionCreated: 1,
        nbAgentsAck: 0,
        type: 'POLICY_REASSIGN',
        nbAgentsActioned: 1,
        status: 'FAILED',
        expiration: '2099-09-16T10:00:00.000Z',
        newPolicyId: 'policy1',
        creationTime: '2022-09-15T10:00:00.000Z',
        nbAgentsFailed: 1,
        completionTime: '2022-09-15T11:00:00.000Z',
      },
    ];
    mockUseActionStatus.mockReturnValue({
      currentActions: mockActionStatuses,
      abortUpgrade: mockAbortUpgrade,
      isFirstLoading: false,
    });
    const result = render(component());

    expect(result.container.querySelector('[data-test-subj="statusTitle"]')!.textContent).toEqual(
      '0 of 1 agent assigned to a new policy'
    );
    expect(
      result.container
        .querySelector('[data-test-subj="statusDescription"]')!
        .textContent?.replace(/\s/g, '')
    ).toContain(
      'A problem occurred during this operation. Started on Sep 15, 2022 10:00 AM.'.replace(
        /\s/g,
        ''
      )
    );
  });

  it('should render agent activity for unknown action', () => {
    const mockActionStatuses = [
      {
        actionId: 'action8',
        nbAgentsActionCreated: 3,
        nbAgentsAck: 0,
        type: 'UNKNOWN',
        nbAgentsActioned: 3,
        status: 'COMPLETE',
        expiration: '2022-09-14T10:00:00.000Z',
        creationTime: '2022-09-15T10:00:00.000Z',
        completionTime: '2022-09-15T12:00:00.000Z',
        nbAgentsFailed: 0,
      },
    ];
    mockUseActionStatus.mockReturnValue({
      currentActions: mockActionStatuses,
      abortUpgrade: mockAbortUpgrade,
      isFirstLoading: false,
    });
    const result = render(component());

    expect(result.container.querySelector('[data-test-subj="statusTitle"]')!.textContent).toEqual(
      '0 of 3 agents actioned'
    );
    expect(
      result.container
        .querySelector('[data-test-subj="statusDescription"]')!
        .textContent?.replace(/\s/g, '')
    ).toContain('Completed Sep 15, 2022 12:00 PM'.replace(/\s/g, ''));
  });

  it('should render agent activity for policy change no agents', () => {
    const mockActionStatuses = [
      {
        actionId: 'action8',
        nbAgentsActionCreated: 0,
        nbAgentsAck: 0,
        type: 'POLICY_CHANGE',
        nbAgentsActioned: 0,
        status: 'COMPLETE',
        expiration: '2099-09-16T10:00:00.000Z',
        policyId: 'policy1',
        revision: 2,
        creationTime: '2022-09-15T10:00:00.000Z',
        nbAgentsFailed: 0,
        completionTime: '2022-09-15T11:00:00.000Z',
      },
    ];
    mockUseActionStatus.mockReturnValue({
      currentActions: mockActionStatuses,
      abortUpgrade: mockAbortUpgrade,
      isFirstLoading: false,
    });
    const result = render(component());

    expect(result.container.querySelector('[data-test-subj="statusTitle"]')!.textContent).toEqual(
      'Policy changed'
    );
    expect(
      result.container
        .querySelector('[data-test-subj="statusDescription"]')!
        .textContent?.replace(/\s/g, '')
    ).toContain('Policy1 changed to revision 2 at Sep 15, 2022 10:00 AM.'.replace(/\s/g, ''));
  });

  it('should render agent activity for policy change with agents', () => {
    const mockActionStatuses = [
      {
        actionId: 'action8',
        nbAgentsActionCreated: 3,
        nbAgentsAck: 3,
        type: 'POLICY_CHANGE',
        nbAgentsActioned: 3,
        status: 'COMPLETE',
        expiration: '2099-09-16T10:00:00.000Z',
        policyId: 'policy1',
        revision: 2,
        creationTime: '2022-09-15T10:00:00.000Z',
        nbAgentsFailed: 0,
        completionTime: '2022-09-15T11:00:00.000Z',
      },
    ];
    mockUseActionStatus.mockReturnValue({
      currentActions: mockActionStatuses,
      abortUpgrade: mockAbortUpgrade,
      isFirstLoading: false,
    });
    const result = render(component());

    expect(result.container.querySelector('[data-test-subj="statusTitle"]')!.textContent).toEqual(
      '3 agents applied policy change'
    );
    expect(
      result.container
        .querySelector('[data-test-subj="statusDescription"]')!
        .textContent?.replace(/\s/g, '')
    ).toContain('Policy1 changed to revision 2 at Sep 15, 2022 10:00 AM.'.replace(/\s/g, ''));
  });

  it('should keep flyout state on new data', () => {
    const failedAction = {
      actionId: 'action1',
      nbAgentsActionCreated: 1,
      nbAgentsAck: 0,
      version: '8.5.0',
      startTime: '2022-09-14T10:00:00.000Z',
      type: 'UPGRADE',
      nbAgentsActioned: 1,
      status: 'FAILED',
      expiration: '2099-09-16T10:00:00.000Z',
      creationTime: '2022-09-14T10:00:00.000Z',
      nbAgentsFailed: 0,
      latestErrors: [
        {
          agentId: 'agent1',
          error: 'Agent 1 is not upgradeable',
          timestamp: '2022-09-14T10:00:00.000Z',
        },
      ],
    };
    const inProgressAction = {
      actionId: 'action2',
      nbAgentsActionCreated: 5,
      nbAgentsAck: 0,
      version: '8.5.0',
      startTime: '2022-09-14T10:00:00.000Z',
      type: 'UPGRADE',
      nbAgentsActioned: 5,
      status: 'IN_PROGRESS',
      expiration: '2099-09-16T10:00:00.000Z',
      creationTime: '2022-09-14T10:00:00.000Z',
      nbAgentsFailed: 0,
      hasRolloutPeriod: true,
    };
    mockUseActionStatus.mockImplementation((onAbortSuccess, refreshAgentActivity) => {
      if (!refreshAgentActivity) {
        return {
          currentActions: [failedAction],
          abortUpgrade: mockAbortUpgrade,
          isFirstLoading: false,
        };
      } else {
        return {
          currentActions: [inProgressAction, failedAction],
          abortUpgrade: mockAbortUpgrade,
          isFirstLoading: false,
        };
      }
    });
    const result = render(component());

    expect(result.getByText('Agent activity')).toBeInTheDocument();
    expect(result.container.querySelector('[data-test-subj="upgradeInProgressTitle"]')).toBe(null);

    act(() => {
      fireEvent.click(result.getByText('Show errors'));
    });

    expect(result.getByText('Agent 1 is not upgradeable')).toBeInTheDocument();

    result.rerender(component(true));

    expect(
      result.container.querySelector('[data-test-subj="upgradeInProgressTitle"]')!.textContent
    ).toEqual('Upgrading 5 agents to version 8.5.0');
    expect(result.getByText('Agent 1 is not upgradeable')).toBeInTheDocument();
  });
});
