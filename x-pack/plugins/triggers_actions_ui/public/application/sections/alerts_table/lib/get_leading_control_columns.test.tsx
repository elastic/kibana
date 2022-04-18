/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { shallow } from 'enzyme';
import { getLeadingControlColumns } from './get_leading_control_columns';

describe('getLeadingControlColumns()', () => {
  it('should return at least the flyout action control', () => {
    const setFlyoutAlertIndex = jest.fn();
    const columns = getLeadingControlColumns({
      leadingControlColumns: [],
      flyoutAlertIndex: 0,
      setFlyoutAlertIndex,
    });
    expect(columns.length).toBe(1);
    expect(columns[0].id).toBe('expand');

    const HeaderComponent = columns[0].headerCellRender;
    const header = shallow(<HeaderComponent />);
    expect(header.text()).toBe('Actions');

    const CellComponent = columns[0].rowCellRender;
    // TODO: there is an issue with types from EUI where it's not including `visibleRowIndex` (https://github.com/elastic/eui/issues/5811)
    // @ts-ignore
    const cell = shallow(<CellComponent visibleRowIndex={0} />);
    expect(cell).toMatchSnapshot();
  });

  it('should only render an icon for the the active row', () => {
    const setFlyoutAlertIndex = jest.fn();
    const columns = getLeadingControlColumns({
      leadingControlColumns: [],
      flyoutAlertIndex: 0,
      setFlyoutAlertIndex,
    });

    const CellComponent = columns[0].rowCellRender;
    // TODO: there is an issue with types from EUI where it's not including `visibleRowIndex` (https://github.com/elastic/eui/issues/5811)
    // @ts-ignore
    const cell = shallow(<CellComponent visibleRowIndex={1} />);
    expect(cell.exists('EuiIcon')).toBe(false);
  });

  it('should set the new index when the alert icon is clicked', () => {
    const setFlyoutAlertIndex = jest.fn();
    const columns = getLeadingControlColumns({
      leadingControlColumns: [],
      flyoutAlertIndex: 2,
      setFlyoutAlertIndex,
    });

    const CellComponent = columns[0].rowCellRender;
    // TODO: there is an issue with types from EUI where it's not including `visibleRowIndex` (https://github.com/elastic/eui/issues/5811)
    // @ts-ignore
    const cell = shallow(<CellComponent visibleRowIndex={2} />);
    cell.find('EuiButtonIcon').simulate('click');
    expect(setFlyoutAlertIndex).toHaveBeenCalledWith(2);
  });

  it('should render other leading controls', () => {
    const setFlyoutAlertIndex = jest.fn();
    const columns = getLeadingControlColumns({
      leadingControlColumns: [
        {
          id: 'selection',
          width: 67,
          headerCellRender: () => <span>Test header</span>,
          rowCellRender: () => <h2>Test cell</h2>,
        },
      ],
      flyoutAlertIndex: 0,
      setFlyoutAlertIndex,
    });
    expect(columns.length).toBe(2);

    const HeaderComponent = columns[1].headerCellRender;
    const header = shallow(<HeaderComponent />);
    expect(header.text()).toBe('Test header');

    const CellComponent = columns[1].rowCellRender;
    // TODO: there is an issue with types from EUI where it's not including `visibleRowIndex` (https://github.com/elastic/eui/issues/5811)
    // @ts-ignore
    const cell = shallow(<CellComponent visibleRowIndex={0} />);
    expect(cell.text()).toBe('Test cell');
  });
});
