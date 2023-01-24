/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';

import React from 'react';

import { DefaultCellRenderer } from '../../cell_rendering/default_cell_renderer';
import '../../../../../common/mock/match_media';
import { mockTimelineData } from '../../../../../common/mock';
import { defaultHeaders } from '../column_headers/default_headers';
import { getDefaultControlColumn } from '../control_columns';

import { DataDrivenColumns, getMappedNonEcsValue } from '.';

describe('Columns', () => {
  const headersSansTimestamp = defaultHeaders.filter((h) => h.id !== '@timestamp');
  const ACTION_BUTTON_COUNT = 4;
  const leadingControlColumns = getDefaultControlColumn(ACTION_BUTTON_COUNT);

  test('it renders the expected columns', () => {
    const wrapper = shallow(
      <DataDrivenColumns
        ariaRowindex={2}
        id={mockTimelineData[0]._id}
        actionsColumnWidth={50}
        checked={false}
        columnHeaders={headersSansTimestamp}
        data={mockTimelineData[0].data}
        ecsData={mockTimelineData[0].ecs}
        hasRowRenderers={false}
        notesCount={0}
        renderCellValue={DefaultCellRenderer}
        timelineId="test"
        columnValues={'abc def'}
        showCheckboxes={false}
        selectedEventIds={{}}
        loadingEventIds={[]}
        onEventDetailsPanelOpened={jest.fn()}
        onRowSelected={jest.fn()}
        showNotes={false}
        isEventPinned={false}
        toggleShowNotes={jest.fn()}
        refetch={jest.fn()}
        eventIdToNoteIds={{}}
        leadingControlColumns={leadingControlColumns}
        trailingControlColumns={[]}
        setEventsLoading={jest.fn()}
        setEventsDeleted={jest.fn()}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });

  describe('getMappedNonEcsValue', () => {
    const existingField = 'Descarte';
    const existingValue = ['IThinkThereforeIAm'];

    test('should return the value if the fieldName is found', () => {
      const result = getMappedNonEcsValue({
        data: [{ field: existingField, value: existingValue }],
        fieldName: existingField,
      });

      expect(result).toBe(existingValue);
    });

    test('should return undefined if the value cannot be found in the array', () => {
      const result = getMappedNonEcsValue({
        data: [{ field: existingField, value: existingValue }],
        fieldName: 'nonExistent',
      });

      expect(result).toBeUndefined();
    });

    test('should return undefined when data is an empty array', () => {
      const result = getMappedNonEcsValue({ data: [], fieldName: existingField });

      expect(result).toBeUndefined();
    });

    test('should return undefined when data is undefined', () => {
      const result = getMappedNonEcsValue({ data: undefined, fieldName: existingField });

      expect(result).toBeUndefined();
    });
  });
});
