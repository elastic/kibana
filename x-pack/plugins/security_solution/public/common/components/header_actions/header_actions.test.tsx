/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { mockTimelineModel, TestProviders } from '../../mock';
import { mockTriggersActionsUi } from '../../mock/mock_triggers_actions_ui_plugin';
import type { ColumnHeaderOptions, HeaderActionProps } from '../../../../common/types';
import { TimelineTabs } from '../../../../common/types';
import { HeaderActions } from './header_actions';
import { timelineActions } from '../../../timelines/store';
import { getColumnHeader } from '../../../timelines/components/timeline/body/column_headers/helpers';

jest.mock('../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

jest.mock('../../../timelines/components/row_renderers_browser', () => ({
  StatefulRowRenderersBrowser: () => <div data-test-subj="show-row-renderers-gear" />,
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../hooks/use_selector', () => ({
  useDeepEqualSelector: () => mockTimelineModel,
  useShallowEqualSelector: jest.fn(),
}));

const columnId = 'test-field';
const timelineId = 'test-timeline';

/* eslint-disable jsx-a11y/click-events-have-key-events */
mockTriggersActionsUi.getFieldBrowser.mockImplementation(
  ({
    onToggleColumn,
    onResetColumns,
  }: {
    onToggleColumn: (columnId: string) => void;
    onResetColumns: () => void;
  }) => (
    <div data-test-subj="mock-field-browser">
      <div data-test-subj="mock-toggle-button" onClick={() => onToggleColumn(columnId)} />
      <div data-test-subj="mock-reset-button" onClick={onResetColumns} />
    </div>
  )
);

jest.mock('../../lib/kibana', () => ({
  useKibana: () => ({
    services: {
      triggersActionsUi: { ...mockTriggersActionsUi },
    },
  }),
}));

const defaultProps: HeaderActionProps = {
  browserFields: {},
  columnHeaders: [],
  isSelectAllChecked: false,
  onSelectAll: jest.fn(),
  showEventsSelect: false,
  showSelectAllCheckbox: false,
  sort: [],
  tabType: TimelineTabs.query,
  timelineId,
  width: 10,
  fieldBrowserOptions: {},
};

describe('HeaderActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FieldBrowser', () => {
    it('should render the field browser', () => {
      const result = render(
        <TestProviders>
          <HeaderActions {...defaultProps} />
        </TestProviders>
      );
      expect(result.getByTestId('mock-field-browser')).toBeInTheDocument();
    });

    it('should dispatch upsertColumn when non existing column is toggled', () => {
      const result = render(
        <TestProviders>
          <HeaderActions {...defaultProps} />
        </TestProviders>
      );
      result.getByTestId('mock-toggle-button').click();

      expect(mockDispatch).toHaveBeenCalledWith(
        timelineActions.upsertColumn({
          column: getColumnHeader(columnId, []),
          id: timelineId,
          index: 1,
        })
      );
    });

    it('should dispatch removeColumn when existing column is toggled', () => {
      const result = render(
        <TestProviders>
          <HeaderActions
            {...defaultProps}
            columnHeaders={[{ id: columnId } as unknown as ColumnHeaderOptions]}
          />
        </TestProviders>
      );
      result.getByTestId('mock-toggle-button').click();

      expect(mockDispatch).toHaveBeenCalledWith(
        timelineActions.removeColumn({
          columnId,
          id: timelineId,
        })
      );
    });

    it('should dispatch updateColumns when columns are reset', () => {
      const result = render(
        <TestProviders>
          <HeaderActions {...defaultProps} />
        </TestProviders>
      );
      result.getByTestId('mock-reset-button').click();

      expect(mockDispatch).toHaveBeenCalledWith(
        timelineActions.updateColumns({ id: timelineId, columns: mockTimelineModel.defaultColumns })
      );
    });
  });

  describe('Controls', () => {
    it('should not show the event renderer settings', () => {
      const result = render(
        <TestProviders>
          <HeaderActions {...defaultProps} />
        </TestProviders>
      );
      expect(result.queryByTestId('show-row-renderers-gear')).toBeNull();
    });

    it('should not show the sorting settings', () => {
      const result = render(
        <TestProviders>
          <HeaderActions {...defaultProps} />
        </TestProviders>
      );
      expect(result.queryByTestId('timeline-sorting-fields')).toBeNull();
    });
  });
});
