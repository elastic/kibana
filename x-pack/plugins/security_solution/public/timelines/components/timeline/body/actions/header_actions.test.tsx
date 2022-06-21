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
import { mockTimelines } from '../../../../../common/mock/mock_timelines_plugin';
import {
  ColumnHeaderOptions,
  HeaderActionProps,
  TimelineTabs,
} from '../../../../../../common/types/timeline';
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

const fieldId = 'test-field';
const timelineId = 'test-timeline';

/* eslint-disable jsx-a11y/click-events-have-key-events */
mockTimelines.getFieldBrowser.mockImplementation(
  ({
    onToggleColumn,
    onResetColumns,
  }: {
    onToggleColumn: (field: string) => void;
    onResetColumns: () => void;
  }) => (
    <div data-test-subj="mock-field-browser">
      <div data-test-subj="mock-toggle-button" onClick={() => onToggleColumn(fieldId)} />
      <div data-test-subj="mock-reset-button" onClick={onResetColumns} />
    </div>
  )
);

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      timelines: { ...mockTimelines },
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
          column: getColumnHeader(fieldId, []),
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
            columnHeaders={[{ id: fieldId } as unknown as ColumnHeaderOptions]}
          />
        </TestProviders>
      );
      result.getByTestId('mock-toggle-button').click();

      expect(mockDispatch).toHaveBeenCalledWith(
        timelineActions.removeColumn({
          columnId: fieldId,
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
