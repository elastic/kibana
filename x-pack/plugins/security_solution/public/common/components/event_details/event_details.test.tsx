/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/dom';
import type { ReactWrapper } from 'enzyme';
import React from 'react';

import '../../mock/match_media';
import '../../mock/react_beautiful_dnd';
import { mockDetailItemData, mockDetailItemDataId, rawEventData, TestProviders } from '../../mock';

import { EventDetails, EventsViewType } from './event_details';
import { mockBrowserFields } from '../../containers/source/mock';
import { useMountAppended } from '../../utils/use_mount_appended';
import { mockAlertDetailsData } from './__mocks__';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { TimelineTabs } from '../../../../common/types/timeline';
import { useInvestigationTimeEnrichment } from '../../containers/cti/event_enrichment';
import { useGetUserCasesPermissions } from '../../lib/kibana';

jest.mock('../../lib/kibana');
const originalKibanaLib = jest.requireActual('../../lib/kibana');

// Restore the useGetUserCasesPermissions so the calling functions can receive a valid permissions object
// The returned permissions object will indicate that the user does not have permissions by default
const mockUseGetUserCasesPermissions = useGetUserCasesPermissions as jest.Mock;
mockUseGetUserCasesPermissions.mockImplementation(originalKibanaLib.useGetUserCasesPermissions);

jest.mock('../../containers/cti/event_enrichment');

jest.mock('../../../detections/containers/detection_engine/rules/use_rule_with_fallback', () => {
  return {
    useRuleWithFallback: jest.fn().mockReturnValue({
      rule: {
        note: 'investigation guide',
      },
    }),
  };
});

jest.mock('../link_to');
describe('EventDetails', () => {
  const mount = useMountAppended();
  const defaultProps = {
    browserFields: mockBrowserFields,
    data: mockDetailItemData,
    id: mockDetailItemDataId,
    isAlert: false,
    onEventViewSelected: jest.fn(),
    onThreatViewSelected: jest.fn(),
    timelineTabType: TimelineTabs.query,
    timelineId: 'test',
    eventView: EventsViewType.summaryView,
    hostRisk: { fields: [], loading: true },
    indexName: 'test',
    handleOnEventClosed: jest.fn(),
    rawEventData,
  };

  const alertsProps = {
    ...defaultProps,
    data: mockAlertDetailsData as TimelineEventsDetailsItem[],
    isAlert: true,
  };

  let wrapper: ReactWrapper;
  let alertsWrapper: ReactWrapper;
  beforeAll(async () => {
    (useInvestigationTimeEnrichment as jest.Mock).mockReturnValue({
      result: [],
      range: { to: 'now', from: 'now-30d' },
      setRange: jest.fn(),
      loading: false,
    });
    wrapper = mount(
      <TestProviders>
        <EventDetails {...defaultProps} />
      </TestProviders>
    ) as ReactWrapper;
    alertsWrapper = mount(
      <TestProviders>
        <EventDetails {...alertsProps} />
      </TestProviders>
    ) as ReactWrapper;
    await waitFor(() => wrapper.update());
  });

  describe('tabs', () => {
    ['Table', 'JSON'].forEach((tab) => {
      test(`it renders the ${tab} tab`, () => {
        expect(
          wrapper
            .find('[data-test-subj="eventDetails"]')
            .find('[role="tablist"]')
            .containsMatchingElement(<span>{tab}</span>)
        ).toBeTruthy();
      });
    });

    test('the Table tab is selected by default', () => {
      expect(
        wrapper.find('[data-test-subj="eventDetails"]').find('.euiTab-isSelected').first().text()
      ).toEqual('Table');
    });
  });

  describe('alerts tabs', () => {
    ['Overview', 'Threat Intel', 'Table', 'JSON'].forEach((tab) => {
      test(`it renders the ${tab} tab`, () => {
        expect(
          alertsWrapper
            .find('[data-test-subj="eventDetails"]')
            .find('[role="tablist"]')
            .containsMatchingElement(<span>{tab}</span>)
        ).toBeTruthy();
      });
    });

    test('the Overview tab is selected by default', () => {
      expect(
        alertsWrapper
          .find('[data-test-subj="eventDetails"]')
          .find('.euiTab-isSelected')
          .first()
          .text()
      ).toEqual('Overview');
    });

    test('Enrichment count is displayed as a notification', () => {
      expect(
        alertsWrapper.find('[data-test-subj="enrichment-count-notification"]').hostNodes().text()
      ).toEqual('1');
    });
  });

  describe('summary view tab', () => {
    it('render investigation guide', () => {
      expect(alertsWrapper.find('[data-test-subj="summary-view-guide"]').exists()).toEqual(true);
    });
  });

  describe('threat intel tab', () => {
    it('renders a "no enrichments" panel view if there are no enrichments', () => {
      alertsWrapper.find('[data-test-subj="threatIntelTab"]').first().simulate('click');
      expect(alertsWrapper.find('[data-test-subj="no-enrichments-found"]').exists()).toEqual(true);
    });
    it('does not render if readOnly prop is passed', async () => {
      const newProps = { ...defaultProps, isReadOnly: true };
      wrapper = mount(
        <TestProviders>
          <EventDetails {...newProps} />
        </TestProviders>
      ) as ReactWrapper;
      alertsWrapper = mount(
        <TestProviders>
          <EventDetails {...{ ...alertsProps, ...newProps }} />
        </TestProviders>
      ) as ReactWrapper;
      await waitFor(() => wrapper.update());
      expect(alertsWrapper.find('[data-test-subj="threatIntelTab"]').exists()).toBeFalsy();
    });
  });

  // TODO adjust to response_actions
  describe.skip('osquery tab', () => {
    it('should not be rendered if not provided with specific raw data', () => {
      expect(alertsWrapper.find('[data-test-subj="osqueryViewTab"]').exists()).toEqual(false);
    });

    it('render osquery tab', async () => {
      const newProps = {
        ...defaultProps,
        rawEventData: {
          ...rawEventData,
          _source: {
            ...rawEventData._source,
            'kibana.alert.rule.name': 'test-rule',
            'kibana.alert.rule.actions': [{ action_type_id: '.osquery' }],
          },
          fields: {
            ...rawEventData.fields,
            'agent.id': ['testAgent'],
          },
        },
      };
      wrapper = mount(
        <TestProviders>
          <EventDetails {...newProps} />
        </TestProviders>
      ) as ReactWrapper;
      alertsWrapper = mount(
        <TestProviders>
          <EventDetails {...{ ...alertsProps, ...newProps }} />
        </TestProviders>
      ) as ReactWrapper;
      await waitFor(() => wrapper.update());

      expect(alertsWrapper.find('[data-test-subj="osqueryViewTab"]').exists());
    });
  });
});
