/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable max-classes-per-file */

interface ResizeObserverMockInterface extends ResizeObserver {
  readonly callback: ResizeObserverCallback;
  elements: Set<Element>;
}

class MockSimulation {
  observers: Set<ResizeObserverMockInterface> = new Set();
  domRects: Map<Element, DOMRect> = new Map();
}

let mockSimulation: MockSimulation | undefined;

/**
 * The value that is used to mock the ResizeObserver constructor,
 * use jest.fn so we have mock metadata.
 * TODO clear after each test
 */
let mockResizeObserverConstructor: jest.Mock<ResizeObserver, [ResizeObserverCallback]>;

/**
 * mock the resize observer polyfill, replacing it with a factory function that registers new mock resize observers and returns em
 */
jest.mock('resize-observer-polyfill', () => {
  class ResizeObserverMock {
    public callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
    public elements: Set<Element> = new Set();
    observe(target: Element): void {
      this.elements.add(target);
    }
    unobserve(target: Element): void {
      this.elements.delete(target);
    }

    disconnect(): void {
      this.elements = new Set();
    }
  }
  console.log('mockin it');
  mockResizeObserverConstructor = jest
    .fn()
    .mockImplementation((callbackinoinoien: ResizeObserverCallback) => {
      const instance = new ResizeObserverMock(callbackinoinoien);
      if (!mockSimulation) {
        mockSimulation = new MockSimulation();
      }
      mockSimulation.observers.add(instance);
      console.log('in thing', typeof instance.observe);
      (instance as any).frig = true;
      return instance;
    });

  const frig2 = new mockResizeObserverConstructor();

  return {
    /**
     * Without this, `default` will not be interpretted as a constructor.
     */
    __esModule: true,
    default: mockResizeObserverConstructor,
  };
});

jest
  .spyOn(Element.prototype, 'getBoundingClientRect')
  .mockImplementation(function(this: Element): DOMRect {
    if (mockSimulation) {
      const rect = mockSimulation.domRects.get(this);
      if (rect) {
        return rect;
      }
    }
    return {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      bottom: 0,
      right: 0,
      width: 0,
      height: 0,
      toJSON() {
        return this;
      },
    };
  });

export const clear = () => {
  mockSimulation = undefined;
  mockResizeObserverConstructor.mockReset();
};

export const simulateElementResize: (element: Element, contentRect: DOMRect) => void = (
  element,
  contentRect
) => {
  if (mockSimulation) {
    mockSimulation.domRects.set(element, contentRect);
    for (const observer of mockSimulation.observers) {
      if (observer.elements.has(element)) {
        observer.callback([{ target: element, contentRect }], observer);
      }
    }
  }
};
