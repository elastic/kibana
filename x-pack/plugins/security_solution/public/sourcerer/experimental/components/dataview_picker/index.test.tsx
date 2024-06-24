/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { useDispatch, useSelector } from 'react-redux';
import { selectDataView } from '../../redux/actions';
import { DataViewPicker } from '.';

// Mock the required hooks and dependencies
jest.mock('../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../redux/actions', () => ({
  selectDataView: jest.fn(),
}));

jest.mock('@kbn/unified-search-plugin/public', () => ({
  DataViewPicker: jest.fn((props) => (
    <div>
      <div>{props.trigger.label}</div>
      <button
        type="button"
        onClick={() => props.onChangeDataView('new-id')}
      >{`Change DataView`}</button>
      <button type="button" onClick={props.onAddField}>
        {`Add Field`}
      </button>
      <button type="button" onClick={props.onDataViewCreated}>
        {`Create New DataView`}
      </button>
    </div>
  )),
}));

describe('DataViewPicker', () => {
  const mockDispatch = jest.fn();
  const mockDataViewEditor = {
    openEditor: jest.fn(),
  };
  const mockDataViewFieldEditor = {
    openEditor: jest.fn(),
  };
  const mockData = {
    dataViews: {
      get: jest.fn().mockResolvedValue({}),
    },
  };

  beforeEach(() => {
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        dataViewEditor: mockDataViewEditor,
        data: mockData,
        dataViewFieldEditor: mockDataViewFieldEditor,
      },
    });
    (useSelector as jest.Mock).mockReturnValue({ dataViewId: 'test-id' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders the DataviewPicker component', () => {
    render(<DataViewPicker />);
    expect(screen.getByText('Dataview')).toBeInTheDocument();
  });

  test('calls dispatch on data view change', () => {
    render(<DataViewPicker />);
    fireEvent.click(screen.getByText('Change DataView'));
    expect(mockDispatch).toHaveBeenCalledWith(selectDataView('new-id'));
  });

  test('opens data view editor when creating a new data view', () => {
    render(<DataViewPicker />);
    fireEvent.click(screen.getByText('Create New DataView'));
    expect(mockDataViewEditor.openEditor).toHaveBeenCalled();
  });
});
