/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActionsContextMenu, type ActionGroups } from '.';

const createActions = (onClickMock: jest.Mock): ActionGroups => [
  {
    id: 'alerts',
    groupLabel: 'Alerts',
    actions: [
      {
        id: 'thresholdRule',
        name: 'Create threshold rule',
        items: [
          { id: 'latency', name: 'Latency', onClick: onClickMock },
          { id: 'errorRate', name: 'Error rate', onClick: onClickMock },
        ],
      },
      { id: 'anomalyRule', name: 'Create anomaly rule', onClick: onClickMock },
    ],
  },
  {
    id: 'slos',
    groupLabel: 'SLOs',
    actions: [
      { id: 'createSlo', name: 'Create SLO', onClick: onClickMock },
      { id: 'manageSlos', name: 'Manage SLOs', href: '/app/slos' },
    ],
  },
];

function renderMenu(
  overrides: Partial<React.ComponentProps<typeof ActionsContextMenu>> = {},
  onClickMock = jest.fn()
) {
  const actions = createActions(onClickMock);
  const button = <button data-test-subj="triggerButton">Actions</button>;

  const result = render(
    <ActionsContextMenu
      actions={actions}
      button={button}
      dataTestSubjPrefix="testMenu"
      {...overrides}
    />
  );

  return { ...result, onClickMock, actions };
}

describe('ActionsContextMenu', () => {
  it('renders the trigger button', () => {
    renderMenu();
    expect(screen.getByTestId('triggerButton')).toBeInTheDocument();
  });

  it('opens popover when trigger button is clicked', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId('triggerButton'));
    expect(screen.getByTestId('testMenuGroup-alerts')).toBeInTheDocument();
  });

  it('closes popover when an action with onClick is clicked', async () => {
    renderMenu();

    fireEvent.click(screen.getByTestId('triggerButton'));
    expect(screen.getByTestId('testMenuItem-anomalyRule')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('testMenuItem-anomalyRule'));
    await waitFor(() => {
      expect(screen.queryByTestId('testMenuItem-anomalyRule')).not.toBeInTheDocument();
    });
  });

  it('renders group labels', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId('triggerButton'));

    expect(screen.getByTestId('testMenuGroup-alerts')).toHaveTextContent('Alerts');
    expect(screen.getByTestId('testMenuGroup-slos')).toHaveTextContent('SLOs');
  });

  it('does not render group label when groupLabel is undefined', () => {
    const actions: ActionGroups = [
      {
        id: 'noLabel',
        actions: [{ id: 'action1', name: 'Action 1' }],
      },
    ];

    render(
      <ActionsContextMenu
        actions={actions}
        button={<button data-test-subj="triggerButton">Open</button>}
        dataTestSubjPrefix="testMenu"
      />
    );

    fireEvent.click(screen.getByTestId('triggerButton'));
    expect(screen.queryByTestId('testMenuGroup-noLabel')).not.toBeInTheDocument();
    expect(screen.getByTestId('testMenuItem-action1')).toBeInTheDocument();
  });

  it('renders all action items in the main panel', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId('triggerButton'));

    expect(screen.getByTestId('testMenuItem-thresholdRule')).toBeInTheDocument();
    expect(screen.getByTestId('testMenuItem-anomalyRule')).toBeInTheDocument();
    expect(screen.getByTestId('testMenuItem-createSlo')).toBeInTheDocument();
    expect(screen.getByTestId('testMenuItem-manageSlos')).toBeInTheDocument();
  });

  it('calls onClick and closes popover when an action is clicked', async () => {
    const { onClickMock } = renderMenu();
    fireEvent.click(screen.getByTestId('triggerButton'));

    fireEvent.click(screen.getByTestId('testMenuItem-anomalyRule'));

    expect(onClickMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByTestId('testMenuItem-anomalyRule')).not.toBeInTheDocument();
    });
  });

  it('renders href actions as links', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId('triggerButton'));

    const manageSlosItem = screen.getByTestId('testMenuItem-manageSlos');
    expect(manageSlosItem.closest('a')).toHaveAttribute('href', '/app/slos');
  });

  it('opens sub-panel when action with items is clicked', async () => {
    renderMenu();
    fireEvent.click(screen.getByTestId('triggerButton'));

    fireEvent.click(screen.getByTestId('testMenuItem-thresholdRule'));

    await waitFor(() => {
      expect(screen.getByTestId('testMenuItem-latency')).toBeInTheDocument();
      expect(screen.getByTestId('testMenuItem-errorRate')).toBeInTheDocument();
    });
  });

  it('calls onClick and closes popover when sub-item is clicked', async () => {
    const { onClickMock } = renderMenu();
    fireEvent.click(screen.getByTestId('triggerButton'));

    fireEvent.click(screen.getByTestId('testMenuItem-thresholdRule'));

    await waitFor(() => {
      expect(screen.getByTestId('testMenuItem-latency')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('testMenuItem-latency'));

    expect(onClickMock).toHaveBeenCalledTimes(1);
  });

  it('uses default prefix when dataTestSubjPrefix is not specified', () => {
    const actions: ActionGroups = [
      { id: 'g', groupLabel: 'Group', actions: [{ id: 'a', name: 'A' }] },
    ];
    render(
      <ActionsContextMenu actions={actions} button={<button data-test-subj="btn">Open</button>} />
    );

    fireEvent.click(screen.getByTestId('btn'));
    expect(screen.getByTestId('actionsContextMenuGroup-g')).toBeInTheDocument();
    expect(screen.getByTestId('actionsContextMenuItem-a')).toBeInTheDocument();
  });

  it('renders empty context menu when no actions are provided', () => {
    render(
      <ActionsContextMenu
        actions={[]}
        button={<button data-test-subj="triggerButton">Open</button>}
      />
    );

    fireEvent.click(screen.getByTestId('triggerButton'));
    expect(screen.queryByTestId('testMenuGroup-alerts')).not.toBeInTheDocument();
  });
});
