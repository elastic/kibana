/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ExpressionRendererProps } from '../../../../../../src/legacy/core_plugins/data/public';
import { Visualization } from '../../types';
import {
  createMockVisualization,
  createMockDatasource,
  createExpressionRendererMock,
  DatasourceMock,
} from '../mocks';
import { WorkspacePanel, WorkspacePanelProps } from './workspace_panel';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { ReactWrapper } from 'enzyme';

const waitForPromises = () => new Promise(resolve => setTimeout(resolve));

describe('workspace_panel', () => {
  let mockVisualization: Visualization;
  let mockDatasource: DatasourceMock;

  let expressionRendererMock: jest.Mock<React.ReactElement, [ExpressionRendererProps]>;

  let instance: ReactWrapper<WorkspacePanelProps>;

  beforeEach(() => {
    mockVisualization = createMockVisualization();

    mockDatasource = createMockDatasource();

    expressionRendererMock = createExpressionRendererMock();
  });

  afterEach(() => {
    instance.unmount();
  });

  it('should render an explanatory text if no visualization is active', () => {
    instance = mount(
      <WorkspacePanel
        activeDatasource={mockDatasource}
        datasourceState={{}}
        activeVisualizationId={null}
        visualizationMap={{
          vis: mockVisualization,
        }}
        visualizationState={{}}
        datasourcePublicAPI={mockDatasource.publicAPIMock}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
      />
    );

    expect(instance.find('[data-test-subj="empty-workspace"]').length).toBe(1);
    expect(instance.find(expressionRendererMock).length).toBe(0);
  });

  it('should render an explanatory text if the visualization does not produce an expression', () => {
    instance = mount(
      <WorkspacePanel
        activeDatasource={{ ...mockDatasource, toExpression: () => 'datasource' }}
        datasourceState={{}}
        activeVisualizationId="vis"
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => null },
        }}
        visualizationState={{}}
        datasourcePublicAPI={mockDatasource.publicAPIMock}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
      />
    );

    expect(instance.find('[data-test-subj="empty-workspace"]').length).toBe(1);
    expect(instance.find(expressionRendererMock).length).toBe(0);
  });

  it('should render an explanatory text if the datasource does not produce an expression', () => {
    instance = mount(
      <WorkspacePanel
        activeDatasource={{ ...mockDatasource, toExpression: () => null }}
        datasourceState={{}}
        activeVisualizationId="vis"
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        visualizationState={{}}
        datasourcePublicAPI={mockDatasource.publicAPIMock}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
      />
    );

    expect(instance.find('[data-test-subj="empty-workspace"]').length).toBe(1);
    expect(instance.find(expressionRendererMock).length).toBe(0);
  });

  it('should render the resulting expression using the expression renderer', () => {
    instance = mount(
      <WorkspacePanel
        activeDatasource={{
          ...mockDatasource,
          toExpression: () => 'datasource',
        }}
        datasourceState={{}}
        activeVisualizationId="vis"
        visualizationMap={{
          vis: { ...mockVisualization, toExpression: () => 'vis' },
        }}
        visualizationState={{}}
        datasourcePublicAPI={mockDatasource.publicAPIMock}
        dispatch={() => {}}
        ExpressionRenderer={expressionRendererMock}
      />
    );

    expect(instance.find(expressionRendererMock).prop('expression')).toMatchInlineSnapshot(`
Object {
  "chain": Array [
    Object {
      "arguments": Object {},
      "function": "datasource",
      "type": "function",
    },
    Object {
      "arguments": Object {},
      "function": "vis",
      "type": "function",
    },
  ],
  "type": "expression",
}
`);
  });

  describe('expression failures', () => {
    it('should show an error message if the expression fails to parse', () => {
      instance = mount(
        <WorkspacePanel
          activeDatasource={{
            ...mockDatasource,
            toExpression: () => 'datasource ||',
          }}
          datasourceState={{}}
          activeVisualizationId="vis"
          visualizationMap={{
            vis: { ...mockVisualization, toExpression: () => 'vis' },
          }}
          visualizationState={{}}
          datasourcePublicAPI={mockDatasource.publicAPIMock}
          dispatch={() => {}}
          ExpressionRenderer={expressionRendererMock}
        />
      );

      expect(instance.find('[data-test-subj="expression-failure"]').length).toBe(1);
      expect(instance.find(expressionRendererMock).length).toBe(0);
    });

    it('should show an error message if the expression fails to render', async () => {
      expressionRendererMock = jest.fn(({ onRenderFailure }) => {
        Promise.resolve().then(() => onRenderFailure!({ type: 'error' }));
        return <span />;
      });

      instance = mount(
        <WorkspacePanel
          activeDatasource={{
            ...mockDatasource,
            toExpression: () => 'datasource',
          }}
          datasourceState={{}}
          activeVisualizationId="vis"
          visualizationMap={{
            vis: { ...mockVisualization, toExpression: () => 'vis' },
          }}
          visualizationState={{}}
          datasourcePublicAPI={mockDatasource.publicAPIMock}
          dispatch={() => {}}
          ExpressionRenderer={expressionRendererMock}
        />
      );

      // "wait" for the expression to execute
      await waitForPromises();

      instance.update();

      expect(instance.find('[data-test-subj="expression-failure"]').length).toBe(1);
      expect(instance.find(expressionRendererMock).length).toBe(0);
    });

    it('should not attempt to run the expression again if it does not change', async () => {
      expressionRendererMock = jest.fn(({ onRenderFailure }) => {
        Promise.resolve().then(() => onRenderFailure!({ type: 'error' }));
        return <span />;
      });

      instance = mount(
        <WorkspacePanel
          activeDatasource={{
            ...mockDatasource,
            toExpression: () => 'datasource',
          }}
          datasourceState={{}}
          activeVisualizationId="vis"
          visualizationMap={{
            vis: { ...mockVisualization, toExpression: () => 'vis' },
          }}
          visualizationState={{}}
          datasourcePublicAPI={mockDatasource.publicAPIMock}
          dispatch={() => {}}
          ExpressionRenderer={expressionRendererMock}
        />
      );

      // "wait" for the expression to execute
      await waitForPromises();

      instance.update();

      expect(expressionRendererMock).toHaveBeenCalledTimes(1);

      instance.update();

      expect(expressionRendererMock).toHaveBeenCalledTimes(1);
    });

    it('should attempt to run the expression again if changes after an error', async () => {
      expressionRendererMock = jest.fn(({ onRenderFailure }) => {
        Promise.resolve().then(() => onRenderFailure!({ type: 'error' }));
        return <span />;
      });

      instance = mount(
        <WorkspacePanel
          activeDatasource={{
            ...mockDatasource,
            toExpression: () => 'datasource',
          }}
          datasourceState={{}}
          activeVisualizationId="vis"
          visualizationMap={{
            vis: { ...mockVisualization, toExpression: () => 'vis' },
          }}
          visualizationState={{}}
          datasourcePublicAPI={mockDatasource.publicAPIMock}
          dispatch={() => {}}
          ExpressionRenderer={expressionRendererMock}
        />
      );

      // "wait" for the expression to execute
      await waitForPromises();

      instance.update();

      expect(expressionRendererMock).toHaveBeenCalledTimes(1);

      expressionRendererMock.mockImplementation(_ => {
        return <span />;
      });

      instance.setProps({ visualizationState: {} });
      instance.update();

      expect(expressionRendererMock).toHaveBeenCalledTimes(2);

      expect(instance.find(expressionRendererMock).length).toBe(1);
    });
  });
});
