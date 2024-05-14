/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { LogStream } from '@kbn/logs-shared-plugin/public';

import { EntSearchLogStream } from '.';

const fakeSourceId = 'fake-source-id';

describe('EntSearchLogStream', () => {
  const mockDateNow = jest.spyOn(global.Date, 'now').mockReturnValue(160000000);

  describe('renders with default props', () => {
    const wrapper = shallow(
      <EntSearchLogStream logView={{ type: 'log-view-reference', logViewId: 'default' }} />
    );

    it('renders a LogStream (wrapped in React.Suspense) component', () => {
      expect(wrapper.type()).toEqual(LogStream);
    });

    it('renders with the empty sourceId', () => {
      expect(wrapper.prop('sourceId')).toBeUndefined();
    });

    it('renders with a default last-24-hours timestamp if no timestamp is passed', () => {
      expect(wrapper.prop('startTimestamp')).toEqual(73600000);
      expect(wrapper.prop('endTimestamp')).toEqual(160000000);
    });
  });

  describe('renders custom props', () => {
    it('overrides the default props', () => {
      const wrapper = shallow(
        <EntSearchLogStream
          logView={{ type: 'log-view-reference', logViewId: 'test' }}
          startTimestamp={1}
          endTimestamp={2}
        />
      );

      expect(wrapper.prop('logView')).toEqual({ type: 'log-view-reference', logViewId: 'test' });
      expect(wrapper.prop('startTimestamp')).toEqual(1);
      expect(wrapper.prop('endTimestamp')).toEqual(2);
    });

    it('allows passing a custom hoursAgo that modifies the default start timestamp', () => {
      const wrapper = shallow(
        <EntSearchLogStream
          logView={{ type: 'log-view-reference', logViewId: fakeSourceId }}
          hoursAgo={1}
        />
      );

      expect(wrapper.prop('startTimestamp')).toEqual(156400000);
      expect(wrapper.prop('endTimestamp')).toEqual(160000000);
    });

    it('allows passing any prop that the LogStream component takes', () => {
      const wrapper = shallow(
        <EntSearchLogStream
          logView={{ type: 'log-view-reference', logViewId: fakeSourceId }}
          height={500}
          highlight="some-log-id"
          columns={[
            { type: 'timestamp', header: 'Timestamp' },
            { type: 'field', field: 'log.level', header: 'Log level', width: 300 },
          ]}
          filters={[]}
        />
      );

      expect(wrapper.prop('height')).toEqual(500);
      expect(wrapper.prop('highlight')).toEqual('some-log-id');
      expect(wrapper.prop('columns')).toBeTruthy();
      expect(wrapper.prop('filters')).toEqual([]);
    });
  });

  afterAll(() => mockDateNow.mockRestore());
});
