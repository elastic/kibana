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
import {
  useMessagesStorage,
  UseMessagesStorage,
} from '../../common/containers/local_storage/use_messages_storage';
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
jest.mock('../../common/containers/local_storage/use_messages_storage');

const endpointNoticeMessage = (hasMessageValue: boolean) => {
  return {
    hasMessage: () => hasMessageValue,
    getMessages: () => [],
    addMessage: () => undefined,
    removeMessage: () => undefined,
    clearAllMessages: () => undefined,
  };
};

describe('Overview', () => {
  describe('rendering', () => {
    test('it renders the Setup Instructions text when no index is available', async () => {
      (useWithSource as jest.Mock).mockReturnValue({
        indicesExist: false,
      });

      const mockuseMessagesStorage: jest.Mock = useMessagesStorage as jest.Mock<UseMessagesStorage>;
      mockuseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));

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

      const mockuseMessagesStorage: jest.Mock = useMessagesStorage as jest.Mock<UseMessagesStorage>;
      mockuseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="empty-page"]').exists()).toBe(false);
    });

    test('it DOES render the Endpoint banner when the endpoint index is NOT available AND storage is NOT set', async () => {
      (useWithSource as jest.Mock).mockReturnValueOnce({
        indicesExist: true,
        indexPattern: {},
      });

      (useWithSource as jest.Mock).mockReturnValueOnce({
        indicesExist: false,
        indexPattern: {},
      });

      const mockuseMessagesStorage: jest.Mock = useMessagesStorage as jest.Mock<UseMessagesStorage>;
      mockuseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="endpoint-prompt-banner"]').exists()).toBe(true);
    });

    test('it does NOT render the Endpoint banner when the endpoint index is NOT available but storage is set', async () => {
      (useWithSource as jest.Mock).mockReturnValueOnce({
        indicesExist: true,
        indexPattern: {},
      });

      (useWithSource as jest.Mock).mockReturnValueOnce({
        indicesExist: false,
        indexPattern: {},
      });

      const mockuseMessagesStorage: jest.Mock = useMessagesStorage as jest.Mock<UseMessagesStorage>;
      mockuseMessagesStorage.mockImplementation(() => endpointNoticeMessage(true));

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="endpoint-prompt-banner"]').exists()).toBe(false);
    });

    test('it does NOT render the Endpoint banner when the endpoint index is available AND storage is set', async () => {
      (useWithSource as jest.Mock).mockReturnValue({
        indicesExist: true,
        indexPattern: {},
      });

      const mockuseMessagesStorage: jest.Mock = useMessagesStorage as jest.Mock<UseMessagesStorage>;
      mockuseMessagesStorage.mockImplementation(() => endpointNoticeMessage(true));

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="endpoint-prompt-banner"]').exists()).toBe(false);
    });

    test('it does NOT render the Endpoint banner when an index IS available but storage is NOT set', async () => {
      (useWithSource as jest.Mock).mockReturnValue({
        indicesExist: true,
        indexPattern: {},
      });

      const mockuseMessagesStorage: jest.Mock = useMessagesStorage as jest.Mock<UseMessagesStorage>;
      mockuseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="endpoint-prompt-banner"]').exists()).toBe(false);
    });
  });
});
