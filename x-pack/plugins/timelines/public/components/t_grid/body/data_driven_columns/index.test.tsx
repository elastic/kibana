/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';

import React from 'react';

import { defaultHeaders } from '../column_headers/default_headers';

import { DataDrivenColumns } from '.';
import { mockTimelineData } from '../../../../mock/mock_timeline_data';
import { TestCellRenderer } from '../../../../mock/cell_renderer';

window.matchMedia = jest.fn().mockImplementation((query) => {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  };
});

describe('Columns', () => {
  const headersSansTimestamp = defaultHeaders.filter((h) => h.id !== '@timestamp');

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
        renderCellValue={TestCellRenderer}
        timelineId="test"
        columnValues={'abc def'}
        showCheckboxes={false}
        selectedEventIds={{}}
        loadingEventIds={[]}
        onEventDetailsPanelOpened={jest.fn()}
        onRowSelected={jest.fn()}
        leadingControlColumns={[]}
        trailingControlColumns={[]}
        setEventsLoading={jest.fn()}
        setEventsDeleted={jest.fn()}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });
});
