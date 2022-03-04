/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent } from '@testing-library/react';
import { ActionProps, HeaderActionProps, TimelineTabs } from '../../../../../common/types';
import { HeaderCheckBox, RowCheckBox } from './checkbox';
import React from 'react';

describe('checkbox control column', () => {
  describe('RowCheckBox', () => {
    const defaultProps: ActionProps = {
      ariaRowindex: 1,
      columnId: 'test-columnId',
      columnValues: 'test-columnValues',
      checked: false,
      onRowSelected: jest.fn(),
      eventId: 'test-event-id',
      loadingEventIds: [],
      onEventDetailsPanelOpened: jest.fn(),
      showCheckboxes: true,
      data: [],
      ecsData: {
        _id: 'test-ecsData-id',
      },
      index: 1,
      rowIndex: 1,
      showNotes: true,
      timelineId: 'test-timelineId',
      setEventsLoading: jest.fn(),
      setEventsDeleted: jest.fn(),
    };
    test('displays loader when id is included on loadingEventIds', () => {
      const { getByTestId } = render(
        <RowCheckBox {...defaultProps} loadingEventIds={[defaultProps.eventId]} />
      );
      expect(getByTestId('event-loader')).not.toBeNull();
    });

    test('calls onRowSelected when checked', () => {
      const onRowSelected = jest.fn();
      const { getByTestId } = render(
        <RowCheckBox {...defaultProps} onRowSelected={onRowSelected} />
      );
      const checkbox = getByTestId(/^select-event/);
      fireEvent.click(checkbox);

      expect(onRowSelected).toHaveBeenCalled();
    });
  });
  describe('HeaderCheckBox', () => {
    const defaultProps: HeaderActionProps = {
      width: 99999,
      browserFields: {},
      columnHeaders: [],
      isSelectAllChecked: true,
      onSelectAll: jest.fn(),
      showEventsSelect: true,
      showSelectAllCheckbox: true,
      sort: [],
      tabType: TimelineTabs.query,
      timelineId: 'test-timelineId',
    };

    test('calls onSelectAll when checked', () => {
      const onSelectAll = jest.fn();
      const { getByTestId } = render(
        <HeaderCheckBox {...defaultProps} onSelectAll={onSelectAll} />
      );
      fireEvent.click(getByTestId('select-all-events'));

      expect(onSelectAll).toHaveBeenCalled();
    });
  });
});
