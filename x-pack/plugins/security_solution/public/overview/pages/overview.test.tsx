/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import '../../common/mock/match_media';
import { TestProviders } from '../../common/mock';
import { useWithSource } from '../../common/containers/source';
import { Overview } from './index';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/containers/source');

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));

describe('Overview', () => {
  describe('rendering', () => {
    test('it renders the Setup Instructions text when no index is available', async () => {
      (useWithSource as jest.Mock).mockReturnValue({
        indicesExist: false,
      });

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="empty-page"]').exists()).toBe(true);
    });

    test('it DOES NOT render the Getting started text when an index is available', async () => {
      (useWithSource as jest.Mock).mockReturnValue({
        indicesExist: true,
        indexPattern: {},
      });
      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="empty-page"]').exists()).toBe(false);
    });
  });
});
