/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import '../../../../common/mock/match_media';
import { mockGlobalState, TestProviders } from '../../../../common/mock';
import { ExpandableHostDetails } from './expandable_host';

describe('Expandable Host Component', () => {
  const mockProps = {
    contextID: 'text-context',
    hostName: 'testHostName',
  };

  describe('ExpandableHostDetails: rendering', () => {
    test('it should render the HostOverview of the ExpandableHostDetails', () => {
      const wrapper = mount(
        <TestProviders>
          <ExpandableHostDetails {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('ExpandableHostDetails').render()).toMatchSnapshot();
    });

    test('it should render the HostOverview of the ExpandableHostDetails with the correct indices', () => {
      const wrapper = mount(
        <TestProviders>
          <ExpandableHostDetails {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('HostOverview').prop('indexNames')).toStrictEqual(
        mockGlobalState.sourcerer.sourcererScopes.default.selectedPatterns
      );
    });
  });
});
