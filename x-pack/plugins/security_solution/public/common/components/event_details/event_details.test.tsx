/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { waitFor } from '@testing-library/dom';
import { ReactWrapper } from 'enzyme';
import React from 'react';

import '../../mock/match_media';
import '../../mock/react_beautiful_dnd';
import { mockDetailItemData, mockDetailItemDataId, TestProviders } from '../../mock';

import { EventDetails, EventsViewType } from './event_details';
import { mockBrowserFields } from '../../containers/source/mock';
import { useMountAppended } from '../../utils/use_mount_appended';
import { mockAlertDetailsData } from './__mocks__';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { TimelineTabs } from '../../../../common/types/timeline';

jest.mock('../link_to');
describe('EventDetails', () => {
  const mount = useMountAppended();
  const defaultProps = {
    browserFields: mockBrowserFields,
    data: mockDetailItemData,
    id: mockDetailItemDataId,
    isAlert: false,
    onViewSelected: jest.fn(),
    timelineTabType: TimelineTabs.query,
    timelineId: 'test',
    view: EventsViewType.summaryView,
  };

  const alertsProps = {
    ...defaultProps,
    data: mockAlertDetailsData as TimelineEventsDetailsItem[],
    isAlert: true,
  };

  let wrapper: ReactWrapper;
  let alertsWrapper: ReactWrapper;
  beforeAll(async () => {
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
    ['Table', 'JSON View'].forEach((tab) => {
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
    ['Summary', 'Table', 'JSON View'].forEach((tab) => {
      test(`it renders the ${tab} tab`, () => {
        expect(
          alertsWrapper
            .find('[data-test-subj="eventDetails"]')
            .find('[role="tablist"]')
            .containsMatchingElement(<span>{tab}</span>)
        ).toBeTruthy();
      });
    });

    test('the Summary tab is selected by default', () => {
      expect(
        alertsWrapper
          .find('[data-test-subj="eventDetails"]')
          .find('.euiTab-isSelected')
          .first()
          .text()
      ).toEqual('Summary');
    });
  });
});
