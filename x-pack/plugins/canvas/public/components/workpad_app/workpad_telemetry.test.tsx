/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { render } from '@testing-library/react';
import {
  withUnconnectedElementsLoadedTelemetry,
  WorkpadLoadedMetric,
  WorkpadLoadedWithErrorsMetric,
} from './workpad_telemetry';
import { METRIC_TYPE } from '../../lib/ui_metric';
import { ExpressionContext, ResolvedArgType } from '../../../types';

jest.mock('react-redux', () => {
  const originalModule = jest.requireActual('react-redux');

  return {
    ...originalModule,
    useSelector: jest.fn(),
  };
});

const trackMetric = jest.fn();
const useSelectorMock = useSelector as jest.Mock;

const Component = withUnconnectedElementsLoadedTelemetry(() => <div />, trackMetric);

const mockWorkpad = {
  id: 'workpadid',
  pages: [
    {
      elements: [{ id: '0' }, { id: '1' }, { id: '2' }, { id: '3' }],
    },
    {
      elements: [{ id: '4' }],
    },
  ],
};

const getMockState = (resolvedArgs: Record<string, ResolvedArgType>) => ({
  transient: { resolvedArgs },
});

const getResolveArgWithState = (state: 'pending' | 'ready' | 'error') =>
  ({
    expressionRenderable: { value: { as: state, type: 'render' }, state, error: null },
    expressionContext: {} as ExpressionContext,
  } as ResolvedArgType);

const arrayToObject = (array: ResolvedArgType[]) =>
  array.reduce<Record<number, ResolvedArgType>>((acc, el, index) => {
    acc[index] = el;
    return acc;
  }, {});

const pendingMockState = getMockState(
  arrayToObject(Array(5).fill(getResolveArgWithState('pending')))
);

const readyMockState = getMockState(arrayToObject(Array(5).fill(getResolveArgWithState('ready'))));

const errorMockState = getMockState(
  arrayToObject([
    ...Array(4).fill(getResolveArgWithState('ready')),
    ...Array(1).fill(getResolveArgWithState('error')),
  ])
);

const emptyElementsMockState = getMockState({});

const notMatchedMockState = getMockState({
  'non-matching-id': getResolveArgWithState('ready'),
});

describe('Elements Loaded Telemetry', () => {
  beforeEach(() => {
    trackMetric.mockReset();
  });

  afterEach(() => {
    useSelectorMock.mockClear();
  });

  it('tracks when all resolvedArgs are completed', () => {
    useSelectorMock.mockImplementation((callback) => {
      return callback(pendingMockState);
    });

    const { rerender } = render(<Component workpad={mockWorkpad} />);
    expect(trackMetric).not.toBeCalled();

    useSelectorMock.mockClear();
    useSelectorMock.mockImplementation((callback) => {
      return callback(readyMockState);
    });

    rerender(<Component workpad={mockWorkpad} />);
    expect(trackMetric).toBeCalledWith(METRIC_TYPE.LOADED, WorkpadLoadedMetric);
  });

  it('only tracks loaded once', () => {
    useSelectorMock.mockImplementation((callback) => {
      return callback(pendingMockState);
    });

    const { rerender } = render(<Component workpad={mockWorkpad} />);
    expect(trackMetric).not.toBeCalled();

    useSelectorMock.mockClear();
    useSelectorMock.mockImplementation((callback) => {
      return callback(readyMockState);
    });

    rerender(<Component workpad={mockWorkpad} />);
    rerender(<Component workpad={mockWorkpad} />);
    expect(trackMetric).toBeCalledTimes(1);
  });

  it('does not track if resolvedArgs are never pending', () => {
    useSelectorMock.mockImplementation((callback) => {
      return callback(readyMockState);
    });

    const { rerender } = render(<Component workpad={mockWorkpad} />);
    rerender(<Component workpad={mockWorkpad} />);
    expect(trackMetric).not.toBeCalled();
  });

  it('tracks if elements are in error state after load', () => {
    useSelectorMock.mockImplementation((callback) => {
      return callback(pendingMockState);
    });

    const { rerender } = render(<Component workpad={mockWorkpad} />);
    expect(trackMetric).not.toBeCalled();

    useSelectorMock.mockClear();
    useSelectorMock.mockImplementation((callback) => {
      return callback(errorMockState);
    });

    rerender(<Component workpad={mockWorkpad} />);
    expect(trackMetric).toBeCalledWith(METRIC_TYPE.LOADED, [
      WorkpadLoadedMetric,
      WorkpadLoadedWithErrorsMetric,
    ]);
  });

  it('tracks when the workpad changes and is loaded', () => {
    const otherWorkpad = {
      id: 'otherworkpad',
      pages: [
        {
          elements: [{ id: '0' }, { id: '1' }, { id: '2' }, { id: '3' }],
        },
        {
          elements: [{ id: '4' }],
        },
      ],
    };

    useSelectorMock.mockImplementation((callback) => {
      return callback(notMatchedMockState);
    });

    const { rerender } = render(<Component workpad={otherWorkpad} />);
    expect(trackMetric).not.toBeCalled();

    rerender(<Component workpad={mockWorkpad} />);
    expect(trackMetric).not.toBeCalled();

    useSelectorMock.mockClear();
    useSelectorMock.mockImplementation((callback) => {
      return callback(readyMockState);
    });

    rerender(<Component workpad={mockWorkpad} />);
    expect(trackMetric).toBeCalledWith(METRIC_TYPE.LOADED, WorkpadLoadedMetric);
  });

  it('does not track if workpad has no elements', () => {
    const otherWorkpad = {
      id: 'otherworkpad',
      pages: [],
    };

    useSelectorMock.mockImplementation((callback) => {
      return callback(emptyElementsMockState);
    });

    const { rerender } = render(<Component workpad={otherWorkpad} />);
    rerender(<Component workpad={otherWorkpad} />);
    expect(trackMetric).not.toBeCalled();
  });
});
