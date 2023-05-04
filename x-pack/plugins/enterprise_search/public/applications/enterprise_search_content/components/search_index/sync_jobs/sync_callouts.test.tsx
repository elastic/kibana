/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syncJobView } from '../../../__mocks__/sync_job.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { SyncStatus, TriggerMethod } from '../../../../../../common/types/connectors';

import { SyncJobCallouts } from './sync_callouts';

describe('SyncCalloutsPanel', () => {
  it('renders', () => {
    const wrapper = shallow(<SyncJobCallouts syncJob={syncJobView} />);

    expect(wrapper).toMatchSnapshot();
  });
  it('renders error job', () => {
    const wrapper = shallow(
      <SyncJobCallouts syncJob={{ ...syncJobView, status: SyncStatus.ERROR }} />
    );

    expect(wrapper).toMatchSnapshot();
  });
  it('renders canceled job', () => {
    const wrapper = shallow(
      <SyncJobCallouts syncJob={{ ...syncJobView, status: SyncStatus.CANCELED }} />
    );

    expect(wrapper).toMatchSnapshot();
  });
  it('renders in progress job', () => {
    const wrapper = shallow(
      <SyncJobCallouts syncJob={{ ...syncJobView, status: SyncStatus.IN_PROGRESS }} />
    );

    expect(wrapper).toMatchSnapshot();
  });
  it('renders different trigger method', () => {
    const wrapper = shallow(
      <SyncJobCallouts
        syncJob={{
          ...syncJobView,
          status: SyncStatus.IN_PROGRESS,
          trigger_method: TriggerMethod.SCHEDULED,
        }}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });
});
