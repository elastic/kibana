/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Visualization } from '../../../types';
import { createMockVisualization, createMockFramePublicAPI, FrameMock } from '../../mocks';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { ReactWrapper } from 'enzyme';
import { WorkspacePanelWrapper, WorkspacePanelWrapperProps } from './workspace_panel_wrapper';

describe('workspace_panel_wrapper', () => {
  let mockVisualization: jest.Mocked<Visualization>;
  let mockFrameAPI: FrameMock;
  let instance: ReactWrapper<WorkspacePanelWrapperProps>;

  beforeEach(() => {
    mockVisualization = createMockVisualization();
    mockFrameAPI = createMockFramePublicAPI();
  });

  afterEach(() => {
    instance.unmount();
  });

  it('should render its children', () => {
    const MyChild = () => <span>The child elements</span>;
    instance = mount(
      <WorkspacePanelWrapper
        dispatch={jest.fn()}
        framePublicAPI={mockFrameAPI}
        visualizationState={{}}
        visualizationId="myVis"
        visualizationMap={{ myVis: mockVisualization }}
        datasourceMap={{}}
        datasourceStates={{}}
        emptyExpression={false}
      >
        <MyChild />
      </WorkspacePanelWrapper>
    );

    expect(instance.find(MyChild)).toHaveLength(1);
  });

  it('should call the toolbar renderer if provided', () => {
    const renderToolbarMock = jest.fn();
    const visState = { internalState: 123 };
    instance = mount(
      <WorkspacePanelWrapper
        dispatch={jest.fn()}
        framePublicAPI={mockFrameAPI}
        visualizationState={visState}
        children={<span />}
        visualizationId="myVis"
        visualizationMap={{ myVis: { ...mockVisualization, renderToolbar: renderToolbarMock } }}
        datasourceMap={{}}
        datasourceStates={{}}
        emptyExpression={false}
      />
    );

    expect(renderToolbarMock).toHaveBeenCalledWith(expect.any(Element), {
      state: visState,
      frame: mockFrameAPI,
      setState: expect.anything(),
    });
  });
});
