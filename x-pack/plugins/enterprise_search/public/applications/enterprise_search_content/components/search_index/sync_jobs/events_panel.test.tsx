/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { TriggerMethod } from '../../../../../../common/types/connectors';

import { SyncJobEventsPanel } from './events_panel';

describe('EventsPanel', () => {
  const events = {
    cancelationRequestedAt: '2022-10-24T02:44:19.660365+00:00',
    canceledAt: '2022-10-24T02:44:19.660365+00:00',
    completed: '2022-10-24T02:44:19.660365+00:00',
    lastUpdated: '2022-10-24T02:44:19.660365+00:00',
    syncRequestedAt: '2022-10-24T02:44:19.660365+00:00',
    syncStarted: '2022-10-24T02:44:19.660365+00:00',
    triggerMethod: TriggerMethod.ON_DEMAND,
  };

  it('renders', () => {
    const wrapper = shallow(<SyncJobEventsPanel {...events} />);

    expect(wrapper).toMatchSnapshot();
  });
  it('renders with some values missing', () => {
    const wrapper = shallow(
      <SyncJobEventsPanel
        {...events}
        cancelationRequestedAt=""
        triggerMethod={TriggerMethod.ON_DEMAND}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });
});
