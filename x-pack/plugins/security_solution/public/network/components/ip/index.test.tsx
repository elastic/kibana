/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import '../../../common/mock/match_media';
import { TestProviders } from '../../../common/mock/test_providers';
import { useMountAppended } from '../../../common/utils/use_mount_appended';

import { Ip } from '.';

jest.mock('../../../common/components/link_to');

describe('Port', () => {
  const mount = useMountAppended();

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('it renders the the ip address', () => {
    const wrapper = mount(
      <TestProviders>
        <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="formatted-ip"]').first().text()).toEqual('10.1.2.3');
  });

  test('it hyperlinks to the network/ip page', () => {
    const wrapper = mount(
      <TestProviders>
        <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="draggable-content-destination.ip"]').find('a').first().props()
        .href
    ).toEqual('/ip/10.1.2.3/source');
  });
});
