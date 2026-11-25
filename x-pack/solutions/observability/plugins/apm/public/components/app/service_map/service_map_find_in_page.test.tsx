/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ServiceMapNode } from '../../../../common/service_map';
import { MOCK_EUI_THEME_FOR_USE_THEME, NODE_HEIGHT, NODE_WIDTH } from './constants';
import { ServiceMapFindInPage } from './service_map_find_in_page';

const mockSetCenter = jest.fn();
const mockSetSearchHighlight = jest.fn();

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({ euiTheme: MOCK_EUI_THEME_FOR_USE_THEME }),
  };
});

jest.mock('@xyflow/react', () => {
  const original = jest.requireActual('@xyflow/react');
  return {
    ...original,
    useReactFlow: () => ({
      setCenter: mockSetCenter,
    }),
  };
});

jest.mock('../../shared/service_map/service_map_search_context', () => ({
  ...jest.requireActual('../../shared/service_map/service_map_search_context'),
  useServiceMapHighlight: () => ({
    setSearchHighlight: mockSetSearchHighlight,
  }),
}));

function serviceNode(
  id: string,
  label: string,
  position: { x: number; y: number }
): ServiceMapNode {
  return {
    id,
    type: 'service',
    position,
    data: { id, label, isService: true },
  };
}

function expectCenteredOn(node: ServiceMapNode) {
  const cx = node.position.x + NODE_WIDTH / 2;
  const cy = node.position.y + NODE_HEIGHT / 2;
  expect(mockSetCenter).toHaveBeenLastCalledWith(cx, cy, expect.any(Object));
}

describe('ServiceMapFindInPage', () => {
  const apple = serviceNode('svc-apple', 'Apple', { x: 0, y: 0 });
  const banana = serviceNode('svc-banana', 'Banana', { x: 200, y: 0 });
  const apricot = serviceNode('svc-apricot', 'Apricot', { x: 400, y: 0 });
  const nodes: ServiceMapNode[] = [apple, banana, apricot];

  beforeEach(() => {
    mockSetCenter.mockClear();
    mockSetSearchHighlight.mockClear();
  });

  it('centers the first match on the first next click', async () => {
    const user = userEvent.setup();
    render(<ServiceMapFindInPage nodes={nodes} />);
    await user.type(screen.getByTestId('serviceMapControlsSearch'), 'p');

    await user.click(screen.getByTestId('serviceMapFindNext'));
    expectCenteredOn(apple);
    expect(screen.getByTestId('serviceMapFindMatchSummary')).toHaveTextContent('1/2');
  });

  it('previous goes to the other match immediately after next (no skip on first click)', async () => {
    const user = userEvent.setup();
    render(<ServiceMapFindInPage nodes={nodes} />);
    await user.type(screen.getByTestId('serviceMapControlsSearch'), 'p');

    await user.click(screen.getByTestId('serviceMapFindNext'));
    expectCenteredOn(apple);

    await user.click(screen.getByTestId('serviceMapFindPrevious'));
    expectCenteredOn(apricot);
    expect(screen.getByTestId('serviceMapFindMatchSummary')).toHaveTextContent('2/2');
  });

  it('previous from initial query centers the last match', async () => {
    const user = userEvent.setup();
    render(<ServiceMapFindInPage nodes={nodes} />);
    await user.type(screen.getByTestId('serviceMapControlsSearch'), 'p');

    await user.click(screen.getByTestId('serviceMapFindPrevious'));
    expectCenteredOn(apricot);
  });

  describe('search highlight context', () => {
    it('sets matching node ids when typing a query', async () => {
      const user = userEvent.setup();
      render(<ServiceMapFindInPage nodes={nodes} />);
      const input = screen.getByTestId('serviceMapControlsSearch');

      await user.type(input, 'ap');
      input.focus();

      const lastCall = mockSetSearchHighlight.mock.calls.at(-1)?.[0];
      expect(lastCall.matchNodeIds).toEqual(new Set(['svc-apple', 'svc-apricot']));
    });

    it('sets active match node id after navigating to next', async () => {
      const user = userEvent.setup();
      render(<ServiceMapFindInPage nodes={nodes} />);
      const input = screen.getByTestId('serviceMapControlsSearch');

      await user.type(input, 'ap');
      await user.click(screen.getByTestId('serviceMapFindNext'));

      const lastCall = mockSetSearchHighlight.mock.calls.at(-1)?.[0];
      expect(lastCall.activeMatchNodeId).toBe('svc-apple');
    });

    it('clears highlight when search query is emptied', async () => {
      const user = userEvent.setup();
      render(<ServiceMapFindInPage nodes={nodes} />);
      const input = screen.getByTestId('serviceMapControlsSearch');

      await user.type(input, 'ap');
      await user.clear(input);

      const lastCall = mockSetSearchHighlight.mock.calls.at(-1)?.[0];
      expect(lastCall.matchNodeIds.size).toBe(0);
      expect(lastCall.activeMatchNodeId).toBeNull();
    });

    it('clears highlight when input loses focus', async () => {
      const user = userEvent.setup();
      render(<ServiceMapFindInPage nodes={nodes} />);
      const input = screen.getByTestId('serviceMapControlsSearch');

      await user.type(input, 'ap');
      fireEvent.blur(input);

      const lastCall = mockSetSearchHighlight.mock.calls.at(-1)?.[0];
      expect(lastCall.matchNodeIds.size).toBe(0);
      expect(lastCall.activeMatchNodeId).toBeNull();
    });
  });

  it('matches a closed group by label and by a member service name', async () => {
    const user = userEvent.setup();
    const group: ServiceMapNode = {
      id: 'namePrefix:opbeans',
      type: 'serviceGroup',
      position: { x: 100, y: 100 },
      data: {
        id: 'namePrefix:opbeans',
        label: 'opbeans',
        isService: false,
        isServiceGroup: true,
        groupKind: 'attribute',
        memberServiceIds: ['opbeans-java', 'opbeans-node'],
        memberCount: 2,
      },
    };

    render(<ServiceMapFindInPage nodes={[group, banana]} />);

    await user.type(screen.getByTestId('serviceMapControlsSearch'), 'opbeans-java');
    await user.click(screen.getByTestId('serviceMapFindNext'));
    expectCenteredOn(group);
    expect(screen.getByTestId('serviceMapFindMatchSummary')).toHaveTextContent('1/1');
  });

  it('does not match a closed group on id prefix (e.g. calls:)', async () => {
    const user = userEvent.setup();
    const group: ServiceMapNode = {
      id: 'calls:search',
      type: 'serviceGroup',
      position: { x: 100, y: 100 },
      data: {
        id: 'calls:search',
        label: 'search',
        isService: false,
        isServiceGroup: true,
        groupKind: 'calls',
        memberServiceIds: ['search', 'indexer'],
        memberCount: 2,
      },
    };

    render(<ServiceMapFindInPage nodes={[group, banana]} />);

    await user.type(screen.getByTestId('serviceMapControlsSearch'), 'call');
    expect(screen.getByTestId('serviceMapFindMatchSummary')).toHaveTextContent('0/0');
    expect(screen.getByTestId('serviceMapFindNext')).toBeDisabled();
  });

  describe('with an open group', () => {
    const box: ServiceMapNode = {
      id: 'calls:search',
      type: 'serviceGroupBox',
      position: { x: 100, y: 100 },
      width: 600,
      height: 300,
      data: {
        id: 'calls:search',
        label: 'Retrieval stack',
        isService: false,
        isServiceGroupBox: true,
        groupKind: 'calls',
        memberServiceIds: ['search', 'indexer'],
        memberCount: 2,
      },
    };
    const member = (id: string, position: { x: number; y: number }): ServiceMapNode => ({
      ...serviceNode(id, id, position),
      parentId: box.id,
      extent: 'parent',
    });
    const search = member('search', { x: 24, y: 72 });
    const indexer = member('indexer', { x: 300, y: 72 });

    it('finds a member and centers on its place on the map, not inside the box', async () => {
      const user = userEvent.setup();
      render(<ServiceMapFindInPage nodes={[box, search, indexer]} />);

      await user.type(screen.getByTestId('serviceMapControlsSearch'), 'indexer');
      await user.click(screen.getByTestId('serviceMapFindNext'));

      expect(mockSetCenter).toHaveBeenLastCalledWith(
        box.position.x + indexer.position.x + NODE_WIDTH / 2,
        box.position.y + indexer.position.y + NODE_HEIGHT / 2,
        expect.any(Object)
      );
      expect(screen.getByTestId('serviceMapFindMatchSummary')).toHaveTextContent('1/1');
    });

    it('finds the group by its name and centers on the middle of the box', async () => {
      const user = userEvent.setup();
      render(<ServiceMapFindInPage nodes={[box, search, indexer]} />);

      await user.type(screen.getByTestId('serviceMapControlsSearch'), 'stack');
      await user.click(screen.getByTestId('serviceMapFindNext'));

      expect(mockSetCenter).toHaveBeenLastCalledWith(
        box.position.x + 300,
        box.position.y + 150,
        expect.any(Object)
      );
      expect(screen.getByTestId('serviceMapFindMatchSummary')).toHaveTextContent('1/1');
    });

    it('does not match the box on its id or on the names of its members', async () => {
      const user = userEvent.setup();
      render(<ServiceMapFindInPage nodes={[box, search, indexer]} />);

      await user.type(screen.getByTestId('serviceMapControlsSearch'), 'calls');
      expect(screen.getByTestId('serviceMapFindMatchSummary')).toHaveTextContent('0/0');

      await user.clear(screen.getByTestId('serviceMapControlsSearch'));
      await user.type(screen.getByTestId('serviceMapControlsSearch'), 'search');
      // Only the `search` service: not the box, which only holds it.
      expect(screen.getByTestId('serviceMapFindMatchSummary')).toHaveTextContent('1/1');
    });

    it('finds the service once, not also its box, when the box is named after it', async () => {
      const user = userEvent.setup();
      // A "by calls" group is named after its busiest member.
      const callsBox: ServiceMapNode = {
        ...box,
        data: { ...box.data, label: 'search' },
      } as ServiceMapNode;
      render(<ServiceMapFindInPage nodes={[callsBox, search, indexer]} />);

      await user.type(screen.getByTestId('serviceMapControlsSearch'), 'search');
      await user.click(screen.getByTestId('serviceMapFindNext'));

      expect(screen.getByTestId('serviceMapFindMatchSummary')).toHaveTextContent('1/1');
      expect(mockSetCenter).toHaveBeenLastCalledWith(
        box.position.x + search.position.x + NODE_WIDTH / 2,
        box.position.y + search.position.y + NODE_HEIGHT / 2,
        expect.any(Object)
      );
    });

    it('skips members that are hidden by a filter', async () => {
      const user = userEvent.setup();
      render(<ServiceMapFindInPage nodes={[box, search, { ...indexer, hidden: true }]} />);

      await user.type(screen.getByTestId('serviceMapControlsSearch'), 'indexer');

      expect(screen.getByTestId('serviceMapFindMatchSummary')).toHaveTextContent('0/0');
    });
  });
});
