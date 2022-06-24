/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { GraphVisualization } from './graph_visualization';
import { Workspace, WorkspaceEdge, WorkspaceNode } from '../../types';

describe('graph_visualization', () => {
  const nodes: WorkspaceNode[] = [
    {
      id: '1',
      color: 'black',
      data: {
        field: 'A',
        term: '1',
      },
      icon: {
        class: 'a',
        code: 'a',
        label: '',
      },
      isSelected: true,
      kx: 5,
      ky: 5,
      label: '1',
      numChildren: 1,
      parent: null,
      scaledSize: 10,
      x: 5,
      y: 5,
    },
    {
      id: '2',
      color: 'red',
      data: {
        field: 'B',
        term: '2',
      },
      icon: {
        class: 'b',
        code: 'b',
        label: '',
      },
      isSelected: false,
      kx: 7,
      ky: 9,
      label: '2',
      numChildren: 0,
      parent: null,
      scaledSize: 10,
      x: 7,
      y: 9,
    },
    {
      id: '3',
      color: 'yellow',
      data: {
        field: 'C',
        term: '3',
      },
      icon: {
        class: 'c',
        code: 'c',
        label: '',
      },
      isSelected: false,
      kx: 12,
      ky: 2,
      label: '3',
      numChildren: 0,
      parent: null,
      scaledSize: 10,
      x: 7,
      y: 9,
    },
  ];
  const edges: WorkspaceEdge[] = [
    {
      isSelected: true,
      label: '',
      topSrc: nodes[0],
      topTarget: nodes[1],
      source: nodes[0],
      target: nodes[1],
      weight: 10,
      width: 2,
    },
    {
      isSelected: true,
      label: '',
      topSrc: nodes[1],
      topTarget: nodes[2],
      source: nodes[1],
      target: nodes[2],
      weight: 10,
      width: 2.2,
    },
  ];
  const workspace = {
    nodes,
    edges,
    selectNone: () => {},
    changeHandler: jest.fn(),
    toggleNodeSelection: jest.fn().mockImplementation((node: WorkspaceNode) => {
      return !node.isSelected;
    }),
    getAllIntersections: jest.fn(),
    removeEdgeFromSelection: jest.fn(),
    addEdgeToSelection: jest.fn(),
    getEdgeSelection: jest.fn().mockImplementation(() => []),
    clearEdgeSelection: jest.fn(),
  } as unknown as jest.Mocked<Workspace>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty workspace without data', () => {
    expect(
      shallow(
        <GraphVisualization
          workspace={{} as unknown as Workspace}
          selectSelected={() => {}}
          onSetControl={() => {}}
          onSetMergeCandidates={() => {}}
        />
      )
    ).toMatchInlineSnapshot(`
      <svg
        className="gphGraph"
        height="100%"
        id="graphSvg"
        pointerEvents="all"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <g />
        </g>
      </svg>
    `);
  });

  it('should render to svg elements', () => {
    expect(
      shallow(
        <GraphVisualization
          workspace={workspace}
          selectSelected={() => {}}
          onSetControl={() => {}}
          onSetMergeCandidates={() => {}}
        />
      )
    ).toMatchSnapshot();
  });

  it('should react to node selection', () => {
    const selectSelectedMock = jest.fn();

    const instance = shallow(
      <GraphVisualization
        workspace={workspace}
        selectSelected={selectSelectedMock}
        onSetControl={() => {}}
        onSetMergeCandidates={() => {}}
      />
    );

    instance.find('.gphNode').last().simulate('click', {});

    expect(workspace.toggleNodeSelection).toHaveBeenCalledWith(nodes[2]);
    expect(selectSelectedMock).toHaveBeenCalledWith(nodes[2]);
    expect(workspace.changeHandler).toHaveBeenCalled();
  });

  it('should react to node deselection', () => {
    const onSetControlMock = jest.fn();
    const instance = shallow(
      <GraphVisualization
        workspace={workspace}
        selectSelected={() => {}}
        onSetControl={onSetControlMock}
        onSetMergeCandidates={() => {}}
      />
    );

    instance.find('.gphNode').first().simulate('click', {});

    expect(workspace.toggleNodeSelection).toHaveBeenCalledWith(nodes[0]);
    expect(onSetControlMock).toHaveBeenCalledWith('none');
    expect(workspace.changeHandler).toHaveBeenCalled();
  });

  it('should react to edge click', () => {
    const instance = shallow(
      <GraphVisualization
        workspace={workspace}
        selectSelected={() => {}}
        onSetControl={() => {}}
        onSetMergeCandidates={() => {}}
      />
    );

    instance.find('.gphEdge').at(1).simulate('click');

    expect(workspace.getAllIntersections).toHaveBeenCalled();
    expect(edges[0].topSrc).toEqual(workspace.getAllIntersections.mock.calls[0][1][0]);
    expect(edges[0].topTarget).toEqual(workspace.getAllIntersections.mock.calls[0][1][1]);
    expect(workspace.removeEdgeFromSelection).toHaveBeenCalled();
  });
});
