/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import '../../../common/mock/match_media';
import { TimelineId } from '../../../../common/types/timeline';
import { TestProviders } from '../../../common/mock';
import { AlertsTableComponent } from './index';

describe('AlertsTableComponent', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <TestProviders>
        <AlertsTableComponent
          timelineId={TimelineId.test}
          canUserCRUD
          hasIndexWrite
          from={'2020-07-07T08:20:18.966Z'}
          loading
          signalsIndex="index"
          to={'2020-07-08T08:20:18.966Z'}
          globalQuery={{
            query: 'query',
            language: 'language',
          }}
          globalFilters={[]}
          deletedEventIds={[]}
          loadingEventIds={[]}
          selectedEventIds={{}}
          isSelectAllChecked={false}
          clearSelected={jest.fn()}
          setEventsLoading={jest.fn()}
          clearEventsLoading={jest.fn()}
          setEventsDeleted={jest.fn()}
          clearEventsDeleted={jest.fn()}
          showBuildingBlockAlerts={false}
          onShowBuildingBlockAlertsChanged={jest.fn()}
          updateTimelineIsLoading={jest.fn()}
          updateTimeline={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[title="Alerts"]')).toBeTruthy();
  });
});
