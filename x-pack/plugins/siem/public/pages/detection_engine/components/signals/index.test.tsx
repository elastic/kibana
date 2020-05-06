/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { SignalsTableComponent, PropsFromRedux } from './index';

describe('SignalsTableComponent', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <SignalsTableComponent
        canUserCRUD
        hasIndexWrite
        from={0}
        loading
        signalsIndex="index"
        to={1}
        globalQuery={{
          query: 'query',
          language: 'language',
        }}
        globalFilters={[]}
        deletedEventIds={[]}
        loadingEventIds={[]}
        selectedEventIds={{}}
        isSelectAllChecked={false}
        clearSelected={(jest.fn() as unknown) as PropsFromRedux['clearSelected']}
        setEventsLoading={(jest.fn() as unknown) as PropsFromRedux['setEventsLoading']}
        clearEventsLoading={(jest.fn() as unknown) as PropsFromRedux['clearEventsLoading']}
        setEventsDeleted={(jest.fn() as unknown) as PropsFromRedux['setEventsDeleted']}
        clearEventsDeleted={(jest.fn() as unknown) as PropsFromRedux['clearEventsDeleted']}
        createTimeline={(jest.fn() as unknown) as PropsFromRedux['createTimeline']}
        updateTimelineIsLoading={
          (jest.fn() as unknown) as PropsFromRedux['updateTimelineIsLoading']
        }
      />
    );

    expect(wrapper.find('[title="Signals"]')).toBeTruthy();
  });
});
