/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../common/mock/test_providers';
import { twoGroups } from '../../timeline/data_providers/mock/mock_and_providers';

import { FlyoutBottomBar, getBadgeCount } from '.';

describe.skip('FlyoutBottomBar', () => {
  describe('getBadgeCount', () => {
    test('it returns 0 when dataProviders is empty', () => {
      expect(getBadgeCount([])).toEqual(0);
    });

    test('it returns a count that includes every provider in every group of ANDs', () => {
      expect(getBadgeCount(twoGroups)).toEqual(6);
    });
  });

  test('it renders the expected button text', () => {
    const wrapper = mount(
      <TestProviders>
        <FlyoutBottomBar timelineId="test" />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="flyout-button-not-ready-to-drop"]').first().text()
    ).toEqual('Timeline');
  });

  test('it renders the data providers drop target area', () => {
    const wrapper = mount(
      <TestProviders>
        <FlyoutBottomBar timelineId="test" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="dataProviders"]').exists()).toBe(true);
  });
});
