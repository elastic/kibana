/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import AddToTimelineButton, { ADD_TO_TIMELINE_KEYBOARD_SHORTCUT } from './add_to_timeline';
import { DataProvider, IS_OPERATOR } from '../../../../common/types';
import { TestProviders } from '../../../mock';
import * as i18n from './translations';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const originalModule = jest.requireActual('react-redux');

  return {
    ...originalModule,
    useDispatch: () => mockDispatch,
  };
});

const mockStartDragToTimeline = jest.fn();
jest.mock('../../../hooks/use_add_to_timeline', () => {
  const originalModule = jest.requireActual('../../../hooks/use_add_to_timeline');

  return {
    ...originalModule,
    useAddToTimeline: () => ({
      beginDrag: jest.fn(),
      cancelDrag: jest.fn(),
      dragToLocation: jest.fn(),
      endDrag: jest.fn(),
      hasDraggableLock: jest.fn(),
      startDragToTimeline: mockStartDragToTimeline,
    }),
  };
});

const providerA: DataProvider = {
  and: [],
  enabled: true,
  excluded: false,
  id: 'context-field.name-a',
  kqlQuery: '',
  name: 'a',
  queryMatch: {
    field: 'field.name',
    value: 'a',
    operator: IS_OPERATOR,
  },
};

const providerB: DataProvider = {
  and: [],
  enabled: true,
  excluded: false,
  id: 'context-field.name-b',
  kqlQuery: '',
  name: 'b',
  queryMatch: {
    field: 'field.name',
    value: 'b',
    operator: IS_OPERATOR,
  },
};

describe('add to timeline', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const field = 'user.name';

  describe('when the `Component` prop is NOT provided', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <AddToTimelineButton field={field} ownFocus={false} />
        </TestProviders>
      );
    });

    test('it renders the button icon', () => {
      expect(screen.getByRole('button')).toHaveClass('timelines__hoverActionButton');
    });

    test('it has the expected aria label', () => {
      expect(screen.getByLabelText(i18n.ADD_TO_TIMELINE)).toBeInTheDocument();
    });
  });

  describe('when the `Component` prop is provided', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <AddToTimelineButton Component={EuiButtonEmpty} field={field} ownFocus={false} />
        </TestProviders>
      );
    });

    test('it renders the component provided via the `Component` prop', () => {
      expect(screen.getByRole('button')).toHaveClass('euiButtonEmpty');
    });

    test('it has the expected aria label', () => {
      expect(screen.getByLabelText(i18n.ADD_TO_TIMELINE)).toBeInTheDocument();
    });
  });

  test('it renders a tooltip when `showTooltip` is true', () => {
    const { container } = render(
      <TestProviders>
        <AddToTimelineButton field={field} ownFocus={false} showTooltip={true} />
      </TestProviders>
    );

    expect(container?.firstChild).toHaveClass('euiToolTipAnchor');
  });

  test('it does NOT render a tooltip when `showTooltip` is false (default)', () => {
    const { container } = render(
      <TestProviders>
        <AddToTimelineButton field={field} ownFocus={false} />
      </TestProviders>
    );

    expect(container?.firstChild).not.toHaveClass('euiToolTipAnchor');
  });

  describe('when the user clicks the button', () => {
    const draggableId = 'abcd';

    test('it starts dragging to timeline when a `draggableId` is provided', () => {
      render(
        <TestProviders>
          <AddToTimelineButton draggableId={draggableId} field={field} ownFocus={false} />
        </TestProviders>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(mockStartDragToTimeline).toBeCalled();
    });

    test('it does NOT start dragging to timeline when a `draggableId` is NOT provided', () => {
      render(
        <TestProviders>
          <AddToTimelineButton field={field} ownFocus={false} />
        </TestProviders>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(mockStartDragToTimeline).not.toBeCalled();
    });

    test('it dispatches a single `addProviderToTimeline` action when a single, non-array `dataProvider` is provided', () => {
      render(
        <TestProviders>
          <AddToTimelineButton dataProvider={providerA} field={field} ownFocus={false} />
        </TestProviders>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(mockDispatch).toHaveBeenCalledTimes(1);

      expect(mockDispatch).toHaveBeenCalledWith({
        payload: {
          dataProvider: {
            and: [],
            enabled: true,
            excluded: false,
            id: 'context-field.name-a',
            kqlQuery: '',
            name: 'a',
            queryMatch: { field: 'field.name', operator: ':', value: 'a' },
          },
          id: 'timeline-1',
        },
        type: 'x-pack/timelines/t-grid/ADD_PROVIDER_TO_TIMELINE',
      });
    });

    test('it dispatches multiple `addProviderToTimeline` actions when an array of `dataProvider` are provided', () => {
      const providers = [providerA, providerB];

      render(
        <TestProviders>
          <AddToTimelineButton
            dataProvider={[providerA, providerB]}
            field={field}
            ownFocus={false}
          />
        </TestProviders>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(mockDispatch).toHaveBeenCalledTimes(2);

      providers.forEach((p, i) =>
        expect(mockDispatch).toHaveBeenNthCalledWith(i + 1, {
          payload: {
            dataProvider: {
              and: [],
              enabled: true,
              excluded: false,
              id: providers[i].id,
              kqlQuery: '',
              name: providers[i].name,
              queryMatch: { field: 'field.name', operator: ':', value: providers[i].name },
            },
            id: 'timeline-1',
          },
          type: 'x-pack/timelines/t-grid/ADD_PROVIDER_TO_TIMELINE',
        })
      );
    });

    test('it invokes the `onClick` (callback) prop when the user clicks the button', () => {
      const onClick = jest.fn();

      render(
        <TestProviders>
          <AddToTimelineButton field={field} onClick={onClick} ownFocus={false} />
        </TestProviders>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(onClick).toBeCalled();
    });
  });

  describe('keyboard event handling', () => {
    describe('when the keyboard shortcut is pressed', () => {
      const keyboardEvent = new KeyboardEvent('keydown', {
        ctrlKey: false,
        key: ADD_TO_TIMELINE_KEYBOARD_SHORTCUT, // <-- the correct shortcut key
        metaKey: false,
      }) as unknown as React.KeyboardEvent;

      beforeEach(() => {
        keyboardEvent.stopPropagation = jest.fn();
        keyboardEvent.preventDefault = jest.fn();
      });

      test('it stops propagation of the keyboard event', async () => {
        await act(async () => {
          render(
            <TestProviders>
              <AddToTimelineButton
                field={field}
                keyboardEvent={keyboardEvent}
                ownFocus={true}
                showTooltip={true}
              />
            </TestProviders>
          );
        });

        expect(keyboardEvent.preventDefault).toHaveBeenCalled();
      });

      test('it prevents the default keyboard event behavior', async () => {
        await act(async () => {
          render(
            <TestProviders>
              <AddToTimelineButton
                field={field}
                keyboardEvent={keyboardEvent}
                ownFocus={true}
                showTooltip={true}
              />
            </TestProviders>
          );
        });

        expect(keyboardEvent.preventDefault).toHaveBeenCalled();
      });

      test('it starts dragging to timeline', async () => {
        await act(async () => {
          render(
            <TestProviders>
              <AddToTimelineButton
                draggableId="abcd"
                field={field}
                keyboardEvent={keyboardEvent}
                ownFocus={true}
                showTooltip={true}
              />
            </TestProviders>
          );
        });

        expect(mockStartDragToTimeline).toBeCalled();
      });
    });

    describe("when a key that's NOT the keyboard shortcut is pressed", () => {
      const keyboardEvent = new KeyboardEvent('keydown', {
        ctrlKey: false,
        key: 'z', // <-- NOT the correct shortcut key
        metaKey: false,
      }) as unknown as React.KeyboardEvent;

      beforeEach(() => {
        keyboardEvent.stopPropagation = jest.fn();
        keyboardEvent.preventDefault = jest.fn();
      });

      test('it does NOT stop propagation of the keyboard event', async () => {
        await act(async () => {
          render(
            <TestProviders>
              <AddToTimelineButton
                field={field}
                keyboardEvent={keyboardEvent}
                ownFocus={true}
                showTooltip={true}
              />
            </TestProviders>
          );
        });

        expect(keyboardEvent.preventDefault).not.toHaveBeenCalled();
      });

      test('it does NOT prevents the default keyboard event behavior', async () => {
        await act(async () => {
          render(
            <TestProviders>
              <AddToTimelineButton
                field={field}
                keyboardEvent={keyboardEvent}
                ownFocus={true}
                showTooltip={true}
              />
            </TestProviders>
          );
        });

        expect(keyboardEvent.preventDefault).not.toHaveBeenCalled();
      });

      test('it does NOT start dragging to timeline', async () => {
        await act(async () => {
          render(
            <TestProviders>
              <AddToTimelineButton
                draggableId="abcd"
                field={field}
                keyboardEvent={keyboardEvent}
                ownFocus={true}
                showTooltip={true}
              />
            </TestProviders>
          );
        });

        expect(mockStartDragToTimeline).not.toBeCalled();
      });
    });
  });
});
