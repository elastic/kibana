/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import { AlertContextMenu } from './alert_context_menu';
import { TimelineId } from '../../../../../common/types';
import { TestProviders } from '../../../../common/mock';
import React from 'react';
import { Ecs } from '../../../../../common/ecs';
import { mockTimelines } from '../../../../common/mock/mock_timelines_plugin';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';

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
  timelineId: 'detections-page',
};

jest.mock('../../../../common/lib/kibana', () => ({
  useToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
  }),
  useKibana: () => ({
    services: {
      timelines: { ...mockTimelines },
      application: {
        capabilities: { siem: { crud_alerts: true, read_alerts: true } },
      },
      cases: mockCasesContract(),
    },
  }),
  useGetUserCasesPermissions: jest.fn().mockReturnValue({
    crud: true,
    read: true,
  }),
}));

jest.mock('../../../containers/detection_engine/alerts/use_alerts_privileges', () => ({
  useAlertsPrivileges: jest.fn().mockReturnValue({ hasIndexWrite: true, hasKibanaCRUD: true }),
}));

const actionMenuButton = '[data-test-subj="timeline-context-menu-button"] button';
const addToExistingCaseButton = '[data-test-subj="add-to-existing-case-action"]';
const addToNewCaseButton = '[data-test-subj="add-to-new-case-action"]';
const markAsOpenButton = '[data-test-subj="open-alert-status"]';
const markAsAcknowledgedButton = '[data-test-subj="acknowledged-alert-status"]';
const markAsClosedButton = '[data-test-subj="close-alert-status"]';

describe('InvestigateInResolverAction', () => {
  test('it render AddToCase context menu item if timelineId === TimelineId.detectionsPage', () => {
    const wrapper = mount(<AlertContextMenu {...props} timelineId={TimelineId.detectionsPage} />, {
      wrappingComponent: TestProviders,
    });

    wrapper.find(actionMenuButton).simulate('click');
    expect(wrapper.find(addToExistingCaseButton).first().exists()).toEqual(true);
    expect(wrapper.find(addToNewCaseButton).first().exists()).toEqual(true);
  });

  test('it render AddToCase context menu item if timelineId === TimelineId.detectionsRulesDetailsPage', () => {
    const wrapper = mount(
      <AlertContextMenu {...props} timelineId={TimelineId.detectionsRulesDetailsPage} />,
      {
        wrappingComponent: TestProviders,
      }
    );

    wrapper.find(actionMenuButton).simulate('click');
    expect(wrapper.find(addToExistingCaseButton).first().exists()).toEqual(true);
    expect(wrapper.find(addToNewCaseButton).first().exists()).toEqual(true);
  });

  test('it render AddToCase context menu item if timelineId === TimelineId.active', () => {
    const wrapper = mount(<AlertContextMenu {...props} timelineId={TimelineId.active} />, {
      wrappingComponent: TestProviders,
    });

    wrapper.find(actionMenuButton).simulate('click');
    expect(wrapper.find(addToExistingCaseButton).first().exists()).toEqual(true);
    expect(wrapper.find(addToNewCaseButton).first().exists()).toEqual(true);
  });

  test('it does NOT render AddToCase context menu item when timelineId is not in the allowed list', () => {
    // In order to enable alert context menu without a timelineId, event needs to be event.kind === 'event' and agent.type === 'endpoint'
    const customProps = {
      ...props,
      ecsRowData: { ...ecsRowData, agent: { type: ['endpoint'] }, event: { kind: ['event'] } },
    };
    const wrapper = mount(<AlertContextMenu {...customProps} timelineId="timeline-test" />, {
      wrappingComponent: TestProviders,
    });
    wrapper.find(actionMenuButton).simulate('click');
    expect(wrapper.find(addToExistingCaseButton).first().exists()).toEqual(false);
    expect(wrapper.find(addToNewCaseButton).first().exists()).toEqual(false);
  });

  test('it renders the correct status action buttons', () => {
    const wrapper = mount(<AlertContextMenu {...props} timelineId={TimelineId.active} />, {
      wrappingComponent: TestProviders,
    });

    wrapper.find(actionMenuButton).simulate('click');

    expect(wrapper.find(markAsOpenButton).first().exists()).toEqual(false);
    expect(wrapper.find(markAsAcknowledgedButton).first().exists()).toEqual(true);
    expect(wrapper.find(markAsClosedButton).first().exists()).toEqual(true);
  });
});
