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
import {
  useMessagesStorage,
  UseMessagesStorage,
} from '../../common/containers/local_storage/use_messages_storage';
import { Overview } from './index';
import { useIngestEnabledCheck } from '../../common/hooks/endpoint/ingest_enabled';
import { useSourcererScope } from '../../common/containers/sourcerer';
import { useFetchIndex } from '../../common/containers/source';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/containers/source');
jest.mock('../../common/containers/sourcerer');
jest.mock('../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn().mockReturnValue({
    from: '2020-07-07T08:20:18.966Z',
    isInitializing: false,
    to: '2020-07-08T08:20:18.966Z',
    setQuery: jest.fn(),
  }),
}));

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));
jest.mock('../../common/hooks/endpoint/ingest_enabled');
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
const mockUseSourcererScope = useSourcererScope as jest.Mock;
const mockUseIngestEnabledCheck = useIngestEnabledCheck as jest.Mock;
const mockUseFetchIndex = useFetchIndex as jest.Mock;
const mockUseMessagesStorage: jest.Mock = useMessagesStorage as jest.Mock<UseMessagesStorage>;
describe('Overview', () => {
  beforeEach(() => {
    mockUseFetchIndex.mockReturnValue([
      false,
      {
        indexExists: true,
      },
    ]);
  });
  describe('rendering', () => {
    test('it DOES NOT render the Getting started text when an index is available', () => {
      mockUseSourcererScope.mockReturnValue({
        selectedPatterns: [],
        indicesExist: true,
        indexPattern: {},
      });

      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));
      mockUseIngestEnabledCheck.mockReturnValue({ allEnabled: true });

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="empty-page"]').exists()).toBe(false);
      wrapper.unmount();
    });

    test('it DOES render the Endpoint banner when the endpoint index is NOT available AND storage is NOT set', () => {
      mockUseFetchIndex.mockReturnValue([
        false,
        {
          indexExists: false,
        },
      ]);
      mockUseSourcererScope.mockReturnValue({
        selectedPatterns: [],
        indicesExist: true,
        indexPattern: {},
      });

      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));
      mockUseIngestEnabledCheck.mockReturnValue({ allEnabled: true });

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="endpoint-prompt-banner"]').exists()).toBe(true);
      wrapper.unmount();
    });

    test('it does NOT render the Endpoint banner when the endpoint index is NOT available but storage is set', () => {
      mockUseFetchIndex.mockReturnValue([
        false,
        {
          indexExists: false,
        },
      ]);
      mockUseSourcererScope.mockReturnValueOnce({
        selectedPatterns: [],
        indicesExist: true,
        indexPattern: {},
      });

      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(true));
      mockUseIngestEnabledCheck.mockReturnValue({ allEnabled: true });

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="endpoint-prompt-banner"]').exists()).toBe(false);
      wrapper.unmount();
    });

    test('it does NOT render the Endpoint banner when the endpoint index is available AND storage is set', () => {
      mockUseSourcererScope.mockReturnValue({
        selectedPatterns: [],
        indexExists: true,
        indexPattern: {},
      });

      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(true));
      mockUseIngestEnabledCheck.mockReturnValue({ allEnabled: true });

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="endpoint-prompt-banner"]').exists()).toBe(false);
      wrapper.unmount();
    });

    test('it does NOT render the Endpoint banner when an index IS available but storage is NOT set', () => {
      mockUseSourcererScope.mockReturnValue({
        selectedPatterns: [],
        indicesExist: true,
        indexPattern: {},
      });

      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));
      mockUseIngestEnabledCheck.mockReturnValue({ allEnabled: true });

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );
      wrapper.update();
      expect(wrapper.find('[data-test-subj="endpoint-prompt-banner"]').exists()).toBe(false);
      wrapper.unmount();
    });

    test('it does NOT render the Endpoint banner when Ingest is NOT available', () => {
      mockUseSourcererScope.mockReturnValue({
        selectedPatterns: [],
        indicesExist: true,
        indexPattern: {},
      });

      mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(true));
      mockUseIngestEnabledCheck.mockReturnValue({ allEnabled: false });

      const wrapper = mount(
        <TestProviders>
          <MemoryRouter>
            <Overview />
          </MemoryRouter>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="endpoint-prompt-banner"]').exists()).toBe(false);
      wrapper.unmount();
    });

    describe('when no index is available', () => {
      beforeEach(() => {
        mockUseSourcererScope.mockReturnValue({
          selectedPatterns: [],
          indicesExist: false,
        });
        mockUseIngestEnabledCheck.mockReturnValue({ allEnabled: false });
        mockUseMessagesStorage.mockImplementation(() => endpointNoticeMessage(false));
      });

      it('renders the Setup Instructions text', () => {
        const wrapper = mount(
          <TestProviders>
            <MemoryRouter>
              <Overview />
            </MemoryRouter>
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="empty-page"]').exists()).toBe(true);
      });

      it('does not show Endpoint get ready button when ingest is not enabled', () => {
        const wrapper = mount(
          <TestProviders>
            <MemoryRouter>
              <Overview />
            </MemoryRouter>
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="empty-page-endpoint-action"]').exists()).toBe(false);
      });

      it('shows Endpoint get ready button when ingest is enabled', () => {
        mockUseIngestEnabledCheck.mockReturnValue({ allEnabled: true });
        const wrapper = mount(
          <TestProviders>
            <MemoryRouter>
              <Overview />
            </MemoryRouter>
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="empty-page-endpoint-action"]').exists()).toBe(true);
      });
    });
  });
});
