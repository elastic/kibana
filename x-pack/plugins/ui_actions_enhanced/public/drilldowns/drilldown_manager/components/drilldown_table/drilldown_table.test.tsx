/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { DrilldownTable, DrilldownTableItem, TEST_SUBJ_DRILLDOWN_ITEM } from './drilldown_table';

const drilldowns: DrilldownTableItem[] = [
  { id: '1', actionName: 'Dashboard', drilldownName: 'Drilldown 1' },
  { id: '2', actionName: 'Dashboard', drilldownName: 'Drilldown 2' },
  { id: '3', actionName: 'Dashboard', drilldownName: 'Drilldown 3', error: 'an error' },
];

test('Render list of drilldowns', () => {
  const screen = render(<DrilldownTable items={drilldowns} />);
  expect(screen.getAllByTestId(TEST_SUBJ_DRILLDOWN_ITEM)).toHaveLength(drilldowns.length);
});

test('Emit onEdit() when clicking on edit drilldown', () => {
  const fn = jest.fn();
  const screen = render(<DrilldownTable items={drilldowns} onEdit={fn} />);

  const editButtons = screen.getAllByText('Edit');
  expect(editButtons).toHaveLength(drilldowns.length);
  fireEvent.click(editButtons[1]);
  expect(fn).toBeCalledWith(drilldowns[1].id);
});

test('Emit onCreate() when clicking on create drilldown', () => {
  const fn = jest.fn();
  const screen = render(<DrilldownTable items={drilldowns} onCreate={fn} />);
  fireEvent.click(screen.getByText('Create new'));
  expect(fn).toBeCalled();
});

test('Delete button is not visible when non is selected', () => {
  const fn = jest.fn();
  const screen = render(<DrilldownTable items={drilldowns} onCreate={fn} />);
  expect(screen.queryByText(/Delete/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Create/i)).toBeInTheDocument();
});

test('Can delete drilldowns', () => {
  const fn = jest.fn();
  const screen = render(<DrilldownTable items={drilldowns} onDelete={fn} />);

  const checkboxes = screen.getAllByLabelText(/Select this drilldown/i);
  expect(checkboxes).toHaveLength(3);

  fireEvent.click(checkboxes[1]);
  fireEvent.click(checkboxes[2]);

  expect(screen.queryByText(/Create/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByText(/Delete \(2\)/i));

  expect(fn).toBeCalledWith([drilldowns[1].id, drilldowns[2].id]);
});

test('Error is displayed', () => {
  const screen = render(<DrilldownTable items={drilldowns} />);
  expect(screen.getByText('an error')).toBeInTheDocument();
});
