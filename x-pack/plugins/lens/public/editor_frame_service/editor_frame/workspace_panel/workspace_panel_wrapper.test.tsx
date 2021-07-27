/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Visualization } from '../../../types';
import { createMockVisualization, createMockFramePublicAPI, FrameMock } from '../../../mocks';
import { WorkspacePanelWrapper } from './workspace_panel_wrapper';
import { mountWithProvider } from '../../../mocks';

describe('workspace_panel_wrapper', () => {
  let mockVisualization: jest.Mocked<Visualization>;
  let mockFrameAPI: FrameMock;

  beforeEach(() => {
    mockVisualization = createMockVisualization();
    mockFrameAPI = createMockFramePublicAPI();
  });

  it('should render its children', async () => {
    const MyChild = () => <span>The child elements</span>;
    const { instance } = await mountWithProvider(
      <WorkspacePanelWrapper
        framePublicAPI={mockFrameAPI}
        visualizationState={{}}
        visualizationId="myVis"
        visualizationMap={{ myVis: mockVisualization }}
        datasourceMap={{}}
        datasourceStates={{}}
        isFullscreen={false}
      >
        <MyChild />
      </WorkspacePanelWrapper>
    );

    expect(instance.find(MyChild)).toHaveLength(1);
  });

  it('should call the toolbar renderer if provided', async () => {
    const renderToolbarMock = jest.fn();
    const visState = { internalState: 123 };
    await mountWithProvider(
      <WorkspacePanelWrapper
        framePublicAPI={mockFrameAPI}
        visualizationState={visState}
        children={<span />}
        visualizationId="myVis"
        visualizationMap={{ myVis: { ...mockVisualization, renderToolbar: renderToolbarMock } }}
        datasourceMap={{}}
        datasourceStates={{}}
        isFullscreen={false}
      />
    );

    expect(renderToolbarMock).toHaveBeenCalledWith(expect.any(Element), {
      state: visState,
      frame: mockFrameAPI,
      setState: expect.anything(),
    });
  });
});
