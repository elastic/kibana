/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { cloneDeep } from 'lodash/fp';
import * as React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import { render } from 'react-testing-library';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { mockFirstLastSeenHostQuery } from '../../../../containers/hosts/first_last_seen/mock';
import { wait } from '../../../../lib/helpers';
import { TestProviders } from '../../../../mock';
import { getEmptyString, getEmptyValue } from '../../../empty_value';

import { createDraggable, getEuiDescriptionList, HostSummary } from './index';
import { mockData } from './mock';

describe('Host Summary Component', () => {
  // this is just a little hack to silence a warning that we'll get until react
  // fixes this: https://github.com/facebook/react/pull/14853
  // For us that mean we need to upgrade to 16.9.0
  // and we will be able to do that when we are in master
  // eslint-disable-next-line no-console
  const originalError = console.error;
  beforeAll(() => {
    // eslint-disable-next-line no-console
    console.error = (...args: string[]) => {
      if (/Warning.*not wrapped in act/.test(args[0])) {
        return;
      }
      originalError.call(console, ...args);
    };
  });

  afterAll(() => {
    // eslint-disable-next-line no-console
    console.error = originalError;
  });

  describe('rendering', () => {
    test('it renders the default Host Summary', () => {
      const wrapper = shallow(
        <TestProviders>
          <HostSummary loading={false} data={mockData.Hosts.edges[0].node} />
        </TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('#createDraggable', () => {
    test('if it creates a draggable component', () => {
      const draggable = createDraggable('debian', 'Platform', 'siem-kibana');
      const wrapper = mountWithIntl(<TestProviders>{draggable}</TestProviders>);
      expect(wrapper.text()).toBe('debian');
    });
    test('if it returns a euiToolTipAnchor element', async () => {
      const { container } = render(
        <TestProviders>
          <MockedProvider mocks={mockFirstLastSeenHostQuery} addTypename={false}>
            {createDraggable(null, 'firstSeen', 'kibana-siem')}
          </MockedProvider>
        </TestProviders>
      );
      await wait();
      expect(container.innerHTML).toBe(
        '<div class="euiText euiText--small"><span class="euiToolTipAnchor">Apr 8, 2019 @ 16:09:40.692</span></div>'
      );
    });
    test('if it returns an empty value', () => {
      const draggable = createDraggable(null, 'Platform', 'siem-kibana');
      const wrapper = mountWithIntl(<TestProviders>{draggable}</TestProviders>);
      expect(wrapper.text()).toBe(getEmptyValue());
    });
    test('if it returns a string placeholder with an empty string', () => {
      const draggable = createDraggable('', 'Platform', 'siem-kibana');
      const wrapper = mountWithIntl(<TestProviders>{draggable}</TestProviders>);
      expect(wrapper.text()).toBe(getEmptyString());
    });
    test('if works with a string with a single space as a valid value and NOT an empty value', () => {
      const draggable = createDraggable(' ', 'Platform', 'siem-kibana');
      const wrapper = mountWithIntl(<TestProviders>{draggable}</TestProviders>);
      expect(wrapper.text()).toBe(' ');
    });
  });

  describe('#getEuiDescriptionList', () => {
    test('All item in description list are loading', async () => {
      const myMockData = cloneDeep(mockData.Hosts.edges[0].node);
      myMockData.host!.name = 'kibana-siem';
      const { container } = render(
        <TestProviders>
          <MockedProvider mocks={mockFirstLastSeenHostQuery} addTypename={false}>
            {getEuiDescriptionList(myMockData, true)}
          </MockedProvider>
        </TestProviders>
      );
      expect(container).toMatchSnapshot();
    });

    test('if IP is an empty list in description list', async () => {
      const myMockData = cloneDeep(mockData.Hosts.edges[0].node);
      myMockData.host!.ip = [];
      const { container } = render(
        <TestProviders>
          <MockedProvider mocks={mockFirstLastSeenHostQuery} addTypename={false}>
            {getEuiDescriptionList(myMockData, false)}
          </MockedProvider>
        </TestProviders>
      );
      await wait();
      expect(container).toMatchSnapshot();
    });
    test('if it creates an empty description list', () => {
      const euiDescriptionList = getEuiDescriptionList(null, false);
      const wrapper = mountWithIntl(<TestProviders>{euiDescriptionList}</TestProviders>);
      expect(wrapper.text()).toBe(
        'Name--First Seen--Last Seen--Id--IP Address--MAC Addr--Type--Platform--OS Name--Family--Version--Architecture--'
      );
    });
  });
});
