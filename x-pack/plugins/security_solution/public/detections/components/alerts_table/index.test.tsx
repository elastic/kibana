/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import '../../../common/mock/match_media';
import { TimelineId } from '../../../../common/types/timeline';
import { TestProviders } from '../../../common/mock';
import { AlertsTableComponent } from '.';

describe('AlertsTableComponent', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <TestProviders>
        <AlertsTableComponent
          timelineId={TimelineId.test}
          hasIndexWrite
          hasIndexMaintenance
          from={'2020-07-07T08:20:18.966Z'}
          loading
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
          setEventsDeleted={jest.fn()}
          showBuildingBlockAlerts={false}
          onShowBuildingBlockAlertsChanged={jest.fn()}
          showOnlyThreatIndicatorAlerts={false}
          onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[title="Alerts"]')).toBeTruthy();
  });
});
