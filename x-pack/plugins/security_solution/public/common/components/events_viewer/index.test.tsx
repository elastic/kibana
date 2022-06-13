/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';

import '../../mock/match_media';
import { render } from '@testing-library/react';
import { TestProviders } from '../../mock';

import { mockEventViewerResponse } from './mock';
import { StatefulEventsViewer } from '.';
import { eventsDefaultModel } from './default_model';
import { EntityType } from '../../../../../timelines/common';
import { TimelineId } from '../../../../common/types/timeline';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import { useTimelineEvents } from '../../../timelines/containers';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { defaultCellActions } from '../../lib/cell_actions/default_cell_actions';
import { UseFieldBrowserOptionsProps } from '../../../timelines/components/fields_browser';

jest.mock('../../../common/lib/kibana');

jest.mock('../../../timelines/containers', () => ({
  useTimelineEvents: jest.fn(),
}));

jest.mock('../../components/url_state/normalize_time_range.ts');

const mockUseFieldBrowserOptions = jest.fn();
jest.mock('../../../timelines/components/fields_browser', () => ({
  useFieldBrowserOptions: (props: UseFieldBrowserOptionsProps) => mockUseFieldBrowserOptions(props),
}));

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

const from = '2019-08-27T22:10:56.794Z';
const to = '2019-08-26T22:10:56.791Z';
const ACTION_BUTTON_COUNT = 4;

const testProps = {
  defaultCellActions,
  defaultModel: eventsDefaultModel,
  end: to,
  entityType: EntityType.ALERTS,
  indexNames: [],
  id: TimelineId.test,
  leadingControlColumns: getDefaultControlColumn(ACTION_BUTTON_COUNT),
  renderCellValue: DefaultCellRenderer,
  rowRenderers: defaultRowRenderers,
  scopeId: SourcererScopeName.default,
  start: from,
};
describe('StatefulEventsViewer', () => {
  (useTimelineEvents as jest.Mock).mockReturnValue([false, mockEventViewerResponse]);

  test('it renders the events viewer', async () => {
    const wrapper = render(
      <TestProviders>
        <StatefulEventsViewer {...testProps} />
      </TestProviders>
    );

    expect(wrapper.getByText('hello grid')).toBeTruthy();
  });

  // InspectButtonContainer controls displaying InspectButton components
  test('it renders InspectButtonContainer', async () => {
    const wrapper = render(
      <TestProviders>
        <StatefulEventsViewer {...testProps} />
      </TestProviders>
    );

    expect(wrapper.getByTestId(`hoverVisibilityContainer`)).toBeTruthy();
  });

  test('it closes field editor when unmounted', async () => {
    const mockCloseEditor = jest.fn();
    mockUseFieldBrowserOptions.mockImplementation(({ editorActionsRef }) => {
      editorActionsRef.current = { closeEditor: mockCloseEditor };
      return {};
    });

    const { unmount } = render(
      <TestProviders>
        <StatefulEventsViewer {...testProps} />
      </TestProviders>
    );
    expect(mockCloseEditor).not.toHaveBeenCalled();

    unmount();
    expect(mockCloseEditor).toHaveBeenCalled();
  });
});
