/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { TestProviders, mockTimelineModel } from '../../../../../common/mock';
import { HeaderActions } from './header_actions';
import { mockTriggersActionsUi } from '../../../../../common/mock/mock_triggers_actions_ui_plugin';
import type {
  ColumnHeaderOptions,
  HeaderActionProps,
} from '../../../../../../common/types/timeline';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { timelineActions } from '../../../../store/timeline';
import { getColumnHeader } from '../column_headers/helpers';

jest.mock('../../../row_renderers_browser', () => ({
  StatefulRowRenderersBrowser: () => null,
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../../common/hooks/use_selector', () => ({
  useDeepEqualSelector: () => mockTimelineModel,
  useShallowEqualSelector: jest.fn(),
}));

const columnId = 'test-field';
const timelineId = TimelineId.test;

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

jest.mock('../../../../../common/lib/kibana', () => ({
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
};

describe('HeaderActions', () => {
  describe('FieldBrowser', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

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
});
