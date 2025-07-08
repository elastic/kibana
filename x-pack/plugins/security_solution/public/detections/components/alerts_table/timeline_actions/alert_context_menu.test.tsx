/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { AlertContextMenu } from './alert_context_menu';
import { TestProviders } from '../../../../common/mock';
import React from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { mockTimelines } from '../../../../common/mock/mock_timelines_plugin';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { initialUserPrivilegesState as mockInitialUserPrivilegesState } from '../../../../common/components/user_privileges/user_privileges_context';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { TableId } from '@kbn/securitysolution-data-table';
import { TimelineId } from '../../../../../common/types/timeline';

jest.mock('../../../../common/components/user_privileges');

const testSecuritySolutionLinkHref = 'test-url';
jest.mock('../../../../common/components/links', () => ({
  useGetSecuritySolutionLinkProps: () => () => ({ href: testSecuritySolutionLinkHref }),
}));

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../../common/hooks/use_license', () => ({
  useLicense: jest.fn().mockReturnValue({ isPlatinumPlus: () => true }),
}));

const ecsRowData: Ecs = {
  _id: '1',
  agent: { type: ['blah'] },
  kibana: {
    alert: {
      workflow_status: ['open'],
      rule: {
        parameters: {},
        uuid: ['testId'],
      },
    },
  },
  event: {
    kind: ['signal'],
  },
};

const props = {
  ariaLabel:
    'Select more actions for the alert or event in row 26, with columns 2021-08-12T11:07:10.552Z Malware Prevention Alert high 73  siem-windows-endpoint SYSTEM powershell.exe mimikatz.exe  ',
  ariaRowindex: 26,
  columnValues:
    '2021-08-12T11:07:10.552Z Malware Prevention Alert high 73  siem-windows-endpoint SYSTEM powershell.exe mimikatz.exe  ',
  disabled: false,
  ecsRowData,
  refetch: jest.fn(),
  timelineId: 'alerts-page',
};

jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');

  return {
    ...original,
    useToasts: jest.fn().mockReturnValue({
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      remove: jest.fn(),
    }),
    useKibana: () => ({
      services: {
        timelines: { ...mockTimelines },
        application: {
          capabilities: { siem: { crud_alerts: true, read_alerts: true } },
        },
        cases: {
          ...mockCasesContract(),
          helpers: {
            canUseCases: jest.fn().mockReturnValue({
              all: true,
              create: true,
              read: true,
              update: true,
              delete: true,
              push: true,
              createComment: true,
              reopenCase: true,
            }),
            getRuleIdFromEvent: jest.fn(),
          },
        },
      },
    }),
  };
});

jest.mock('../../../containers/detection_engine/alerts/use_alerts_privileges', () => ({
  useAlertsPrivileges: jest.fn().mockReturnValue({ hasIndexWrite: true, hasKibanaCRUD: true }),
}));

const actionMenuButton = 'timeline-context-menu-button';
const addToExistingCaseButton = 'add-to-existing-case-action';
const addToNewCaseButton = 'add-to-new-case-action';
const markAsOpenButton = 'open-alert-status';
const markAsAcknowledgedButton = 'acknowledged-alert-status';
const markAsClosedButton = 'close-alert-status';
const addEndpointEventFilterButton = 'add-event-filter-menu-item';
const applyAlertTagsButton = 'alert-tags-context-menu-item';
const applyAlertAssigneesButton = 'alert-assignees-context-menu-item';

describe('Alert table context menu', () => {
  describe('Case actions', () => {
    test('it render AddToCase context menu item if timelineId === TimelineId.detectionsPage', async () => {
      const wrapper = render(
        <TestProviders>
          <AlertContextMenu {...props} scopeId={TableId.alertsOnAlertsPage} />
        </TestProviders>
      );

      await userEvent.click(wrapper.getByTestId(actionMenuButton));

      await waitFor(() => {
        expect(wrapper.getByTestId(addToExistingCaseButton)).toBeTruthy();
        expect(wrapper.getByTestId(addToNewCaseButton)).toBeTruthy();
      });
    });

    test('it render AddToCase context menu item if timelineId === TimelineId.detectionsRulesDetailsPage', async () => {
      const wrapper = render(
        <TestProviders>
          <AlertContextMenu {...props} scopeId={TableId.alertsOnRuleDetailsPage} />
        </TestProviders>
      );

      await userEvent.click(wrapper.getByTestId(actionMenuButton));

      await waitFor(() => {
        expect(wrapper.getByTestId(addToExistingCaseButton)).toBeTruthy();
        expect(wrapper.getByTestId(addToNewCaseButton)).toBeTruthy();
      });
    });

    test('it render AddToCase context menu item if timelineId === TimelineId.active', async () => {
      const wrapper = render(
        <TestProviders>
          <AlertContextMenu {...props} scopeId={TimelineId.active} />
        </TestProviders>
      );

      await userEvent.click(wrapper.getByTestId(actionMenuButton));

      await waitFor(() => {
        expect(wrapper.getByTestId(addToExistingCaseButton)).toBeTruthy();
        expect(wrapper.getByTestId(addToNewCaseButton)).toBeTruthy();
      });
    });

    test('it does NOT render AddToCase context menu item when timelineId is not in the allowed list', async () => {
      const wrapper = render(
        <TestProviders>
          <AlertContextMenu {...props} scopeId="timeline-test" />
        </TestProviders>
      );
      await userEvent.click(wrapper.getByTestId(actionMenuButton));

      expect(wrapper.queryByTestId(addToExistingCaseButton)).toBeNull();
      expect(wrapper.queryByTestId(addToNewCaseButton)).toBeNull();
    });
  });

  describe('Alert status actions', () => {
    test('it renders the correct status action buttons', async () => {
      const wrapper = render(
        <TestProviders>
          <AlertContextMenu {...props} scopeId={TimelineId.active} />
        </TestProviders>
      );

      await userEvent.click(wrapper.getByTestId(actionMenuButton));

      expect(wrapper.queryByTestId(markAsOpenButton)).toBeNull();
      expect(wrapper.getByTestId(markAsAcknowledgedButton)).toBeInTheDocument();
      expect(wrapper.getByTestId(markAsClosedButton)).toBeInTheDocument();
    });
  });

  describe('Endpoint event filter actions', () => {
    describe('AddEndpointEventFilter', () => {
      const endpointEventProps = {
        ...props,
        ecsRowData: { ...ecsRowData, agent: { type: ['endpoint'] }, event: { kind: ['event'] } },
      };

      describe('when users has write event filters privilege', () => {
        beforeEach(() => {
          (useUserPrivileges as jest.Mock).mockReturnValue({
            ...mockInitialUserPrivilegesState(),
            endpointPrivileges: { loading: false, canWriteEventFilters: true },
          });
        });

        test('it disables AddEndpointEventFilter when timeline id is not host events page', async () => {
          const wrapper = render(
            <TestProviders>
              <AlertContextMenu {...endpointEventProps} scopeId={TimelineId.active} />
            </TestProviders>
          );

          await userEvent.click(wrapper.getByTestId(actionMenuButton));

          const button = wrapper.getByTestId(addEndpointEventFilterButton);

          expect(button).toBeInTheDocument();
          expect(button).toBeDisabled();
        });

        test('it enables AddEndpointEventFilter when timeline id is host events page', async () => {
          const wrapper = render(
            <TestProviders>
              <AlertContextMenu {...endpointEventProps} scopeId={TableId.hostsPageEvents} />
            </TestProviders>
          );

          await userEvent.click(wrapper.getByTestId(actionMenuButton));

          const button = wrapper.getByTestId(addEndpointEventFilterButton);

          expect(button).toBeInTheDocument();
          expect(button).not.toBeDisabled();
        });

        test('it disables AddEndpointEventFilter when timeline id is host events page but is not from endpoint', async () => {
          const customProps = {
            ...props,
            ecsRowData: { ...ecsRowData, agent: { type: ['other'] }, event: { kind: ['event'] } },
          };
          const wrapper = render(
            <TestProviders>
              <AlertContextMenu {...customProps} scopeId={TableId.hostsPageEvents} />
            </TestProviders>
          );

          await userEvent.click(wrapper.getByTestId(actionMenuButton));

          const button = wrapper.getByTestId(addEndpointEventFilterButton);

          expect(button).toBeInTheDocument();
          expect(button).toBeDisabled();
        });

        test('it enables AddEndpointEventFilter when timeline id is user events page', async () => {
          const wrapper = render(
            <TestProviders>
              <AlertContextMenu {...endpointEventProps} scopeId={TableId.usersPageEvents} />
            </TestProviders>
          );

          await userEvent.click(wrapper.getByTestId(actionMenuButton));

          const button = wrapper.getByTestId(addEndpointEventFilterButton);

          expect(button).toBeInTheDocument();
          expect(button).not.toBeDisabled();
        });

        test('it disables AddEndpointEventFilter when timeline id is user events page but is not from endpoint', async () => {
          const customProps = {
            ...props,
            ecsRowData: { ...ecsRowData, agent: { type: ['other'] }, event: { kind: ['event'] } },
          };
          const wrapper = render(
            <TestProviders>
              <AlertContextMenu {...customProps} scopeId={TableId.usersPageEvents} />
            </TestProviders>
          );

          await userEvent.click(wrapper.getByTestId(actionMenuButton));

          const button = wrapper.getByTestId(addEndpointEventFilterButton);

          expect(button).toBeInTheDocument();
          expect(button).toBeDisabled();
        });
      });

      describe("when users don't have write event filters privilege", () => {
        beforeEach(() => {
          (useUserPrivileges as jest.Mock).mockReturnValue({
            ...mockInitialUserPrivilegesState(),
            endpointPrivileges: { loading: false, canWriteEventFilters: false },
          });
        });

        test('it disables actionMenuButton when timeline id is host events page but does not has write event filters privilege', () => {
          const wrapper = render(
            <TestProviders>
              <AlertContextMenu {...endpointEventProps} scopeId={TableId.hostsPageEvents} />
            </TestProviders>
          );

          // <TestProviders>Entire actionMenuButton is disabled as there is no option available
          expect(wrapper.getByTestId(actionMenuButton)).toBeDisabled();
        });

        test('it disables actionMenuButton when timeline id is user events page but does not has write event filters privilege', () => {
          const wrapper = render(
            <TestProviders>
              <AlertContextMenu {...endpointEventProps} scopeId={TableId.usersPageEvents} />
            </TestProviders>
          );

          // <TestProviders>Entire actionMenuButton is disabled as there is no option available
          expect(wrapper.getByTestId(actionMenuButton)).toBeDisabled();
        });
      });
    });

    describe('Apply alert tags action', () => {
      test('it renders the apply alert tags action button', async () => {
        const wrapper = render(
          <TestProviders>
            <AlertContextMenu {...props} scopeId={TimelineId.active} />
          </TestProviders>
        );

        await userEvent.click(wrapper.getByTestId(actionMenuButton));

        await waitFor(() => {
          expect(wrapper.getByTestId(applyAlertTagsButton)).toBeTruthy();
        });
      });
    });

    describe('Assign alert action', () => {
      test('it renders the assign alert action button', async () => {
        const wrapper = render(
          <TestProviders>
            <AlertContextMenu {...props} scopeId={TimelineId.active} />
          </TestProviders>
        );

        await userEvent.click(wrapper.getByTestId(actionMenuButton));

        await waitFor(() => {
          expect(wrapper.getByTestId(applyAlertAssigneesButton)).toBeTruthy();
        });
      });
    });
  });
});
