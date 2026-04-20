/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ServiceMapNode } from '../../../../common/service_map';
import { MOCK_EUI_THEME_FOR_USE_THEME, NODE_HEIGHT, NODE_WIDTH } from './constants';
import { ServiceMapFindInPage } from './service_map_find_in_page';

const mockSetCenter = jest.fn();

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
});
