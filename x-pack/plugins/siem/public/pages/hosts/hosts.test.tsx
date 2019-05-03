/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';

import { Hosts } from './hosts';

import { mocksSource } from '../../containers/source/mock';
import { TestProviders } from '../../mock';
import { MockedProvider } from 'react-apollo/test-utils';
import { cloneDeep } from 'lodash/fp';

import * as i18n from './translations';

jest.mock('ui/documentation_links', () => ({
  documentationLinks: {
    kibana: 'http://www.example.com',
  },
}));

let localSource: Array<{
  request: {};
  result: {
    data: {
      source: {
        status: {
          auditbeatIndicesExist: boolean;
          filebeatIndicesExist: boolean;
          winlogbeatIndicesExist: boolean;
        };
      };
    };
  };
}>;

describe('Hosts', () => {
  describe('rendering', () => {
    beforeEach(() => {
      localSource = cloneDeep(mocksSource);
    });

    test('it renders the Setup Instructions text when no index is available', async () => {
      localSource[0].result.data.source.status.auditbeatIndicesExist = false;
      localSource[0].result.data.source.status.filebeatIndicesExist = false;
      localSource[0].result.data.source.status.winlogbeatIndicesExist = false;
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={localSource} addTypename={false}>
            <Hosts />
          </MockedProvider>
        </TestProviders>
      );
      // Why => https://github.com/apollographql/react-apollo/issues/1711
      await new Promise(resolve => setTimeout(resolve));
      wrapper.update();
      expect(wrapper.text()).toContain(i18n.SETUP_INSTRUCTIONS);
    });

    test('it renders the Setup Instructions text when auditbeat index is not available', async () => {
      localSource[0].result.data.source.status.auditbeatIndicesExist = false;
      localSource[0].result.data.source.status.filebeatIndicesExist = true;
      localSource[0].result.data.source.status.winlogbeatIndicesExist = true;
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={localSource} addTypename={false}>
            <Hosts />
          </MockedProvider>
        </TestProviders>
      );
      // Why => https://github.com/apollographql/react-apollo/issues/1711
      await new Promise(resolve => setTimeout(resolve));
      wrapper.update();
      expect(wrapper.text()).toContain(i18n.SETUP_INSTRUCTIONS);
    });

    test('it DOES NOT render the Setup Instructions text when auditbeat index is available', async () => {
      localSource[0].result.data.source.status.auditbeatIndicesExist = true;
      localSource[0].result.data.source.status.filebeatIndicesExist = false;
      localSource[0].result.data.source.status.winlogbeatIndicesExist = false;
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={localSource} addTypename={false}>
            <Hosts />
          </MockedProvider>
        </TestProviders>
      );
      // Why => https://github.com/apollographql/react-apollo/issues/1711
      await new Promise(resolve => setTimeout(resolve));
      wrapper.update();
      expect(wrapper.text()).not.toContain(i18n.SETUP_INSTRUCTIONS);
    });
  });
});
