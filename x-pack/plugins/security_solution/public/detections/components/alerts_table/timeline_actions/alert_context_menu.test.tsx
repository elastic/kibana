/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, type ComponentType as EnzymeComponentType } from 'enzyme';
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

const actionMenuButton = '[data-test-subj="timeline-context-menu-button"] button';
const addToExistingCaseButton = '[data-test-subj="add-to-existing-case-action"]';
const addToNewCaseButton = '[data-test-subj="add-to-new-case-action"]';
const markAsOpenButton = '[data-test-subj="open-alert-status"]';
const markAsAcknowledgedButton = '[data-test-subj="acknowledged-alert-status"]';
const markAsClosedButton = '[data-test-subj="close-alert-status"]';
const addEndpointEventFilterButton = '[data-test-subj="add-event-filter-menu-item"]';
const applyAlertTagsButton = '[data-test-subj="alert-tags-context-menu-item"]';
const applyAlertAssigneesButton = '[data-test-subj="alert-assignees-context-menu-item"]';

describe('Alert table context menu', () => {
  describe('Case actions', () => {
    test('it render AddToCase context menu item if timelineId === TimelineId.detectionsPage', () => {
      const wrapper = mount(<AlertContextMenu {...props} scopeId={TableId.alertsOnAlertsPage} />, {
        wrappingComponent: TestProviders as EnzymeComponentType<{}>,
      });

      wrapper.find(actionMenuButton).simulate('click');
      expect(wrapper.find(addToExistingCaseButton).first().exists()).toEqual(true);
      expect(wrapper.find(addToNewCaseButton).first().exists()).toEqual(true);
    });

    test('it render AddToCase context menu item if timelineId === TimelineId.detectionsRulesDetailsPage', () => {
      const wrapper = mount(
        <AlertContextMenu {...props} scopeId={TableId.alertsOnRuleDetailsPage} />,
        {
          wrappingComponent: TestProviders as EnzymeComponentType<{}>,
        }
      );

      wrapper.find(actionMenuButton).simulate('click');
      expect(wrapper.find(addToExistingCaseButton).first().exists()).toEqual(true);
      expect(wrapper.find(addToNewCaseButton).first().exists()).toEqual(true);
    });

    test('it render AddToCase context menu item if timelineId === TimelineId.active', () => {
      const wrapper = mount(<AlertContextMenu {...props} scopeId={TimelineId.active} />, {
        wrappingComponent: TestProviders as EnzymeComponentType<{}>,
      });

      wrapper.find(actionMenuButton).simulate('click');
      expect(wrapper.find(addToExistingCaseButton).first().exists()).toEqual(true);
      expect(wrapper.find(addToNewCaseButton).first().exists()).toEqual(true);
    });

    test('it does NOT render AddToCase context menu item when timelineId is not in the allowed list', () => {
      const wrapper = mount(<AlertContextMenu {...props} scopeId="timeline-test" />, {
        wrappingComponent: TestProviders as EnzymeComponentType<{}>,
      });
      wrapper.find(actionMenuButton).simulate('click');
      expect(wrapper.find(addToExistingCaseButton).first().exists()).toEqual(false);
      expect(wrapper.find(addToNewCaseButton).first().exists()).toEqual(false);
    });
  });

  describe('Alert status actions', () => {
    test('it renders the correct status action buttons', () => {
      const wrapper = mount(<AlertContextMenu {...props} scopeId={TimelineId.active} />, {
        wrappingComponent: TestProviders as EnzymeComponentType<{}>,
      });

      wrapper.find(actionMenuButton).simulate('click');

      expect(wrapper.find(markAsOpenButton).first().exists()).toEqual(false);
      expect(wrapper.find(markAsAcknowledgedButton).first().exists()).toEqual(true);
      expect(wrapper.find(markAsClosedButton).first().exists()).toEqual(true);
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

        test('it disables AddEndpointEventFilter when timeline id is not host events page', () => {
          const wrapper = mount(
            <AlertContextMenu {...endpointEventProps} scopeId={TimelineId.active} />,
            {
              wrappingComponent: TestProviders as EnzymeComponentType<{}>,
            }
          );

          wrapper.find(actionMenuButton).simulate('click');
          expect(wrapper.find(addEndpointEventFilterButton).first().exists()).toEqual(true);
          expect(wrapper.find(addEndpointEventFilterButton).first().props().disabled).toEqual(true);
        });

        test('it enables AddEndpointEventFilter when timeline id is host events page', () => {
          const wrapper = mount(
            <AlertContextMenu {...endpointEventProps} scopeId={TableId.hostsPageEvents} />,
            {
              wrappingComponent: TestProviders as EnzymeComponentType<{}>,
            }
          );

          wrapper.find(actionMenuButton).simulate('click');
          expect(wrapper.find(addEndpointEventFilterButton).first().exists()).toEqual(true);
          expect(wrapper.find(addEndpointEventFilterButton).first().props().disabled).toEqual(
            false
          );
        });

        test('it disables AddEndpointEventFilter when timeline id is host events page but is not from endpoint', () => {
          const customProps = {
            ...props,
            ecsRowData: { ...ecsRowData, agent: { type: ['other'] }, event: { kind: ['event'] } },
          };
          const wrapper = mount(
            <AlertContextMenu {...customProps} scopeId={TableId.hostsPageEvents} />,
            {
              wrappingComponent: TestProviders as EnzymeComponentType<{}>,
            }
          );

          wrapper.find(actionMenuButton).simulate('click');
          expect(wrapper.find(addEndpointEventFilterButton).first().exists()).toEqual(true);
          expect(wrapper.find(addEndpointEventFilterButton).first().props().disabled).toEqual(true);
        });

        test('it enables AddEndpointEventFilter when timeline id is user events page', () => {
          const wrapper = mount(
            <AlertContextMenu {...endpointEventProps} scopeId={TableId.usersPageEvents} />,
            {
              wrappingComponent: TestProviders as EnzymeComponentType<{}>,
            }
          );

          wrapper.find(actionMenuButton).simulate('click');
          expect(wrapper.find(addEndpointEventFilterButton).first().exists()).toEqual(true);
          expect(wrapper.find(addEndpointEventFilterButton).first().props().disabled).toEqual(
            false
          );
        });

        test('it disables AddEndpointEventFilter when timeline id is user events page but is not from endpoint', () => {
          const customProps = {
            ...props,
            ecsRowData: { ...ecsRowData, agent: { type: ['other'] }, event: { kind: ['event'] } },
          };
          const wrapper = mount(
            <AlertContextMenu {...customProps} scopeId={TableId.usersPageEvents} />,
            {
              wrappingComponent: TestProviders as EnzymeComponentType<{}>,
            }
          );

          wrapper.find(actionMenuButton).simulate('click');
          expect(wrapper.find(addEndpointEventFilterButton).first().exists()).toEqual(true);
          expect(wrapper.find(addEndpointEventFilterButton).first().props().disabled).toEqual(true);
        });
      });

      describe("when users don't have write event filters privilege", () => {
        beforeEach(() => {
          (useUserPrivileges as jest.Mock).mockReturnValue({
            ...mockInitialUserPrivilegesState(),
            endpointPrivileges: { loading: false, canWriteEventFilters: false },
          });
        });

        test('it removes AddEndpointEventFilter option when timeline id is host events page but does not has write event filters privilege', () => {
          const wrapper = mount(
            <AlertContextMenu {...endpointEventProps} scopeId={TableId.hostsPageEvents} />,
            {
              wrappingComponent: TestProviders as EnzymeComponentType<{}>,
            }
          );

          // Entire actionMenuButton is removed as there is no option available
          expect(wrapper.find(actionMenuButton).first().exists()).toEqual(false);
        });

        test('it removes AddEndpointEventFilter option when timeline id is user events page but does not has write event filters privilege', () => {
          const wrapper = mount(
            <AlertContextMenu {...endpointEventProps} scopeId={TableId.usersPageEvents} />,
            {
              wrappingComponent: TestProviders as EnzymeComponentType<{}>,
            }
          );

          // Entire actionMenuButton is removed as there is no option available
          expect(wrapper.find(actionMenuButton).first().exists()).toEqual(false);
        });
      });
    });
  });

  describe('Apply alert tags action', () => {
    test('it renders the apply alert tags action button', () => {
      const wrapper = mount(<AlertContextMenu {...props} scopeId={TimelineId.active} />, {
        wrappingComponent: TestProviders as EnzymeComponentType<{}>,
      });

      wrapper.find(actionMenuButton).simulate('click');

      expect(wrapper.find(applyAlertTagsButton).first().exists()).toEqual(true);
    });
  });

  describe('Assign alert action', () => {
    test('it renders the assign alert action button', () => {
      const wrapper = mount(<AlertContextMenu {...props} scopeId={TimelineId.active} />, {
        wrappingComponent: TestProviders as EnzymeComponentType<{}>,
      });

      wrapper.find(actionMenuButton).simulate('click');

      expect(wrapper.find(applyAlertAssigneesButton).first().exists()).toEqual(true);
    });
  });
});
