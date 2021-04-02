/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import { FramePublicAPI, VisualizationDimensionEditorProps } from '../../types';
import { DatatableVisualizationState } from '../visualization';
import { createMockDatasource, createMockFramePublicAPI } from '../../editor_frame_service/mocks';
import { mountWithIntl } from '@kbn/test/jest';
import { TableDimensionEditor } from './dimension_editor';

describe('data table dimension editor', () => {
  let frame: FramePublicAPI;
  let state: DatatableVisualizationState;
  let setState: (newState: DatatableVisualizationState) => void;
  let props: VisualizationDimensionEditorProps<DatatableVisualizationState>;

  function testState(): DatatableVisualizationState {
    return {
      layerId: 'first',
      columns: [
        {
          columnId: 'foo',
        },
      ],
    };
  }

  beforeEach(() => {
    state = testState();
    frame = createMockFramePublicAPI();
    frame.datasourceLayers = {
      first: createMockDatasource('test').publicAPIMock,
    };
    frame.activeData = {
      first: {
        type: 'datatable',
        columns: [
          {
            id: 'foo',
            name: 'foo',
            meta: {
              type: 'string',
            },
          },
        ],
        rows: [],
      },
    };
    setState = jest.fn();
    props = {
      accessor: 'foo',
      frame,
      groupId: 'columns',
      layerId: 'first',
      state,
      setState,
    };
  });

  it('should render default alignment', () => {
    const instance = mountWithIntl(<TableDimensionEditor {...props} />);
    expect(instance.find(EuiButtonGroup).prop('idSelected')).toEqual(
      expect.stringContaining('left')
    );
  });

  it('should render default alignment for number', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    const instance = mountWithIntl(<TableDimensionEditor {...props} />);
    expect(instance.find(EuiButtonGroup).prop('idSelected')).toEqual(
      expect.stringContaining('right')
    );
  });

  it('should render specific alignment', () => {
    state.columns[0].alignment = 'center';
    const instance = mountWithIntl(<TableDimensionEditor {...props} />);
    expect(instance.find(EuiButtonGroup).prop('idSelected')).toEqual(
      expect.stringContaining('center')
    );
  });

  it('should set state for the right column', () => {
    state.columns = [
      {
        columnId: 'foo',
      },
      {
        columnId: 'bar',
      },
    ];
    const instance = mountWithIntl(<TableDimensionEditor {...props} />);
    instance.find(EuiButtonGroup).prop('onChange')('center');
    expect(setState).toHaveBeenCalledWith({
      ...state,
      columns: [
        {
          columnId: 'foo',
          alignment: 'center',
        },
        {
          columnId: 'bar',
        },
      ],
    });
  });
});
