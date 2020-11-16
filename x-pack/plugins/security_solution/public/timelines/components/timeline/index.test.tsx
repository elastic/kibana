/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';

import '../../../common/mock/match_media';
import { mockBrowserFields, mockDocValueFields } from '../../../common/containers/source/mock';

import {
  mockIndexNames,
  mockIndexPattern,
  mockTimelineData,
  TestProviders,
} from '../../../common/mock';

import { StatefulTimeline, Props as StatefulTimelineOwnProps } from './index';
import { useTimelineEvents } from '../../containers/index';

jest.mock('../../containers/index', () => ({
  useTimelineEvents: jest.fn(),
}));

jest.mock('../../../common/lib/kibana');
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
    timelineId: 'id',
    onClose: jest.fn(),
    usersViewing: [],
  };

  beforeEach(() => {
    (useTimelineEvents as jest.Mock).mockReturnValue([false, { events: mockTimelineData }]);
  });

  test('renders ', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulTimeline {...props} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="timeline"]')).toBeTruthy();
  });
});
