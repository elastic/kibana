/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import '../../../../../common/mock/match_media';
import { mockTimelineData, TestProviders } from '../../../../../common/mock';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';
import { HostWorkingDir } from './host_working_dir';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    // eslint-disable-next-line react/display-name
    EuiScreenReaderOnly: () => <></>,
  };
});

describe('HostWorkingDir', () => {
  const mount = useMountAppended();

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <HostWorkingDir
        eventId={mockTimelineData[0].ecs._id}
        contextId="test"
        hostName="[hostname-123]"
        workingDirectory="[working-directory-123]"
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('it renders a hostname without a workingDirectory', () => {
    const wrapper = mount(
      <TestProviders>
        <div>
          <HostWorkingDir
            eventId={mockTimelineData[0].ecs._id}
            contextId="test"
            hostName="[hostname-123]"
            workingDirectory={undefined}
          />
        </div>
      </TestProviders>
    );

    expect(wrapper.text()).toEqual('[hostname-123]');
  });

  test('it renders a hostname with a workingDirectory set to null', () => {
    const wrapper = mount(
      <TestProviders>
        <div>
          <HostWorkingDir
            eventId={mockTimelineData[0].ecs._id}
            contextId="test"
            hostName="[hostname-123]"
            workingDirectory={null}
          />
        </div>
      </TestProviders>
    );

    expect(wrapper.text()).toEqual('[hostname-123]');
  });

  test('it renders a a workingDirectory without a hostname with words "in" at the beginning', () => {
    const wrapper = mount(
      <TestProviders>
        <div>
          <HostWorkingDir
            eventId={mockTimelineData[0].ecs._id}
            contextId="test"
            hostName={undefined}
            workingDirectory="[working-directory-123]"
          />
        </div>
      </TestProviders>
    );

    expect(wrapper.text()).toEqual('in[working-directory-123]');
  });

  test('it renders a a workingDirectory with hostname set to null with words "in" at the beginning', () => {
    const wrapper = mount(
      <TestProviders>
        <div>
          <HostWorkingDir
            eventId={mockTimelineData[0].ecs._id}
            contextId="test"
            hostName={null}
            workingDirectory="[working-directory-123]"
          />
        </div>
      </TestProviders>
    );

    expect(wrapper.text()).toEqual('in[working-directory-123]');
  });
});
