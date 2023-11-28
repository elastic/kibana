/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';
import { mount } from 'enzyme';
import type { ReactWrapper } from 'enzyme';
import React from 'react';

import '../../mock/match_media';
import '../../mock/react_beautiful_dnd';
import {
  mockDetailItemData,
  mockDetailItemDataId,
  mockEcsDataWithAlert,
  rawEventData,
  TestProviders,
} from '../../mock';

import { EventDetails, EVENT_DETAILS_CONTEXT_ID, EventsViewType } from './event_details';
import { mockBrowserFields } from '../../containers/source/mock';
import { mockAlertDetailsData } from './__mocks__';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { TimelineTabs } from '../../../../common/types/timeline';
import { useInvestigationTimeEnrichment } from '../../containers/cti/event_enrichment';
import { useGetUserCasesPermissions, useKibana } from '../../lib/kibana';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';

jest.mock('../../hooks/use_experimental_features');
jest.mock('../../../timelines/components/timeline/body/renderers', () => {
  return {
    defaultRowRenderers: [
      {
        id: 'test',
        isInstance: () => true,
        renderRow: jest.fn(),
      },
    ],
  };
});

jest.mock('../../lib/kibana');
const originalKibanaLib = jest.requireActual('../../lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

// Restore the useGetUserCasesPermissions so the calling functions can receive a valid permissions object
// The returned permissions object will indicate that the user does not have permissions by default
const mockUseGetUserCasesPermissions = useGetUserCasesPermissions as jest.Mock;
mockUseGetUserCasesPermissions.mockImplementation(originalKibanaLib.useGetUserCasesPermissions);

jest.mock('../../containers/cti/event_enrichment');

jest.mock('../../../detection_engine/rule_management/logic/use_rule_with_fallback', () => {
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
  const defaultProps = {
    browserFields: mockBrowserFields,
    data: mockDetailItemData,
    detailsEcsData: mockEcsDataWithAlert,
    id: mockDetailItemDataId,
    isAlert: false,
    onEventViewSelected: jest.fn(),
    onThreatViewSelected: jest.fn(),
    timelineTabType: TimelineTabs.query,
    scopeId: 'table-test',
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

    test('it renders the alert / event via a renderer', () => {
      expect(alertsWrapper.find('[data-test-subj="renderer"]').first().text()).toEqual(
        'Access event  with  source 192.168.0.1:80,  destination 192.168.0.3:6343,  by john.dee on apache'
      );
    });

    test('it invokes `renderRow()` with the expected `contextId`, to ensure unique drag & drop IDs', () => {
      expect((defaultRowRenderers[0].renderRow as jest.Mock).mock.calls[0][0].contextId).toEqual(
        EVENT_DETAILS_CONTEXT_ID
      );
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

  describe('osquery tab', () => {
    let featureFlags: { endpointResponseActionsEnabled: boolean; responseActionsEnabled: boolean };

    beforeEach(() => {
      featureFlags = { endpointResponseActionsEnabled: false, responseActionsEnabled: true };

      const useIsExperimentalFeatureEnabledMock = (feature: keyof typeof featureFlags) =>
        featureFlags[feature];

      (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
        useIsExperimentalFeatureEnabledMock
      );
    });
    it('should not be rendered if not provided with specific raw data', () => {
      expect(alertsWrapper.find('[data-test-subj="osqueryViewTab"]').exists()).toEqual(false);
    });

    it('render osquery tab', async () => {
      const {
        services: { osquery },
      } = useKibanaMock();
      if (osquery) {
        jest.spyOn(osquery, 'fetchAllLiveQueries').mockReturnValue({
          data: {
            // @ts-expect-error - we don't need all the response details to test the functionality
            data: {
              items: [
                {
                  _id: 'testId',
                  _index: 'testIndex',
                  fields: {
                    action_id: ['testActionId'],
                    'queries.action_id': ['testQueryActionId'],
                    'queries.query': ['select * from users'],
                    '@timestamp': ['2022-09-08T18:16:30.256Z'],
                  },
                },
              ],
            },
          },
        });
      }
      const newProps = {
        ...defaultProps,
        rawEventData: {
          ...rawEventData,
          fields: {
            ...rawEventData.fields,
            'agent.id': ['testAgent'],
            'kibana.alert.rule.name': ['test-rule'],
            'kibana.alert.rule.parameters': [
              {
                response_actions: [{ action_type_id: '.osquery' }],
              },
            ],
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

      expect(alertsWrapper.find('[data-test-subj="osqueryViewTab"]').exists()).toEqual(true);
    });
  });
});
