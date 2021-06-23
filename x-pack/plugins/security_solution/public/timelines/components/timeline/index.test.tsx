/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';

import { DragDropContextWrapper } from '../../../common/components/drag_and_drop/drag_drop_context_wrapper';
import '../../../common/mock/match_media';
import { mockBrowserFields, mockDocValueFields } from '../../../common/containers/source/mock';
import { TimelineId } from '../../../../common/types/timeline';
import { mockIndexNames, mockIndexPattern, TestProviders } from '../../../common/mock';

import { StatefulTimeline, Props as StatefulTimelineOwnProps } from './index';
import { useTimelineEvents } from '../../containers/index';
import { DefaultCellRenderer } from './cell_rendering/default_cell_renderer';
import { SELECTOR_TIMELINE_GLOBAL_CONTAINER } from './styles';
import { defaultRowRenderers } from './body/renderers';

jest.mock('../../containers/index', () => ({
  useTimelineEvents: jest.fn(),
}));

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/components/url_state/normalize_time_range.ts');
jest.mock('@kbn/i18n/react', () => {
  const originalModule = jest.requireActual('@kbn/i18n/react');
  const FormattedRelative = jest.fn().mockImplementation(() => '20 hours ago');

  return {
    ...originalModule,
    FormattedRelative,
  };
});
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
jest.mock('../../../common/containers/sourcerer', () => {
  const originalModule = jest.requireActual('../../../common/containers/sourcerer');

  return {
    ...originalModule,
    useSourcererScope: jest.fn().mockReturnValue({
      browserFields: mockBrowserFields,
      docValueFields: mockDocValueFields,
      loading: false,
      indexPattern: mockIndexPattern,
      pageInfo: { activePage: 0, querySize: 0 },
      selectedPatterns: mockIndexNames,
    }),
  };
});
describe('StatefulTimeline', () => {
  const props: StatefulTimelineOwnProps = {
    renderCellValue: DefaultCellRenderer,
    rowRenderers: defaultRowRenderers,
    timelineId: TimelineId.test,
  };

  beforeEach(() => {
    (useTimelineEvents as jest.Mock).mockReturnValue([
      false,
      {
        events: [],
        pageInfo: {
          activePage: 0,
          totalPages: 10,
          querySize: 0,
        },
      },
    ]);
  });

  test('renders ', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulTimeline {...props} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="timeline"]')).toBeTruthy();
  });

  test(`it add attribute data-timeline-id in ${SELECTOR_TIMELINE_GLOBAL_CONTAINER}`, () => {
    const wrapper = mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <StatefulTimeline {...props} />
        </DragDropContextWrapper>
      </TestProviders>
    );
    expect(
      wrapper
        .find(`[data-timeline-id="test"].${SELECTOR_TIMELINE_GLOBAL_CONTAINER}`)
        .first()
        .exists()
    ).toEqual(true);
  });
});
