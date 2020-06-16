/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { ReactExpressionRendererProps } from '../../../../../../src/plugins/expressions/public';
import { FramePublicAPI, TableSuggestion, Visualization } from '../../types';
import {
  createMockVisualization,
  createMockDatasource,
  createExpressionRendererMock,
  DatasourceMock,
  createMockFramePublicAPI,
  FrameMock,
} from '../mocks';
import { InnerWorkspacePanel, WorkspacePanelProps } from './workspace_panel';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { ReactWrapper } from 'enzyme';
import { DragDrop, ChildDragDropProvider } from '../../drag_drop';
import { Ast } from '@kbn/interpreter/common';
import { coreMock } from 'src/core/public/mocks';
import {
  DataPublicPluginStart,
  esFilters,
  IFieldType,
  IIndexPattern,
} from '../../../../../../src/plugins/data/public';
import { TriggerId, UiActionsStart } from '../../../../../../src/plugins/ui_actions/public';
import { uiActionsPluginMock } from '../../../../../../src/plugins/ui_actions/public/mocks';
import { TriggerContract } from '../../../../../../src/plugins/ui_actions/public/triggers';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../../src/plugins/visualizations/public/embeddable';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
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
        activeVisualization={mockVisualization}
      >
        <MyChild />
      </WorkspacePanelWrapper>
    );

    expect(instance.find(MyChild)).toHaveLength(1);
  });

  it('should call the tooltip renderer if provided', () => {
    const renderToolbarMock = jest.fn();
    const visState = { internalState: 123 };
    instance = mount(
      <WorkspacePanelWrapper
        dispatch={jest.fn()}
        framePublicAPI={mockFrameAPI}
        visualizationState={visState}
        children={<span />}
        activeVisualization={{ ...mockVisualization, renderToolbar: renderToolbarMock }}
      />
    );

    expect(renderToolbarMock).toHaveBeenCalledWith(expect.anything(), {
      state: visState,
      frame: mockFrameAPI,
      setState: expect.anything(),
    });
  });
});
