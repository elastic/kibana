/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import useResizeObserver from 'use-resize-observer/polyfilled';

import '../../../common/mock/match_media';
import {
  mockBrowserFields,
  mockDocValueFields,
  mocksSource,
} from '../../../common/containers/source/mock';

import {
  mockIndexNames,
  mockIndexPattern,
  mockTimelineData,
  TestProviders,
} from '../../../common/mock';

import { StatefulTimeline, OwnProps as StatefulTimelineOwnProps } from './index';
import { useTimelineEvents } from '../../containers/index';
import { mockPatterns } from '../../../common/containers/sourcerer/mocks';

jest.mock('../../containers/index', () => ({
  useTimelineEvents: jest.fn(),
}));

jest.mock('../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../common/lib/kibana');

  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: {
        uiSettings: {
          get: jest.fn(),
        },
        data: {
          search: {
            search: jest.fn().mockImplementation(() => ({
              subscribe: jest.fn().mockImplementation(() => ({
                error: jest.fn(),
                next: jest.fn(),
              })),
            })),
          },
        },
        notifications: {},
      },
    }),
    useUiSetting$: jest.fn().mockImplementation(() => [mockPatterns]),
    useGetUserSavedObjectPermissions: jest.fn(),
  };
});
jest.mock('../../../common/components/url_state/normalize_time_range.ts');

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: jest.fn(),
  };
});
jest.mock('../flyout/header_with_close_button');
jest.mock('../../../common/containers/sourcerer', () => {
  const originalModule = jest.requireActual('../../../common/containers/sourcerer');

  return {
    ...originalModule,
    useSourcererScope: jest.fn().mockReturnValue({
      browserFields: mockBrowserFields,
      docValueFields: mockDocValueFields,
      loading: false,
      indexPattern: mockIndexPattern,
      selectedPatterns: mockIndexNames,
    }),
  };
});
describe('StatefulTimeline', () => {
  const props: StatefulTimelineOwnProps = {
    id: 'id',
    onClose: jest.fn(),
    usersViewing: [],
  };

  const mocks = mocksSource;

  beforeEach(() => {
    (useTimelineEvents as jest.Mock).mockReturnValue([false, { events: mockTimelineData }]);
  });

  test('renders ', () => {
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mocks} addTypename={false}>
          <StatefulTimeline {...props} />
        </MockedProvider>
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="timeline"]')).toBeTruthy();
  });
});
