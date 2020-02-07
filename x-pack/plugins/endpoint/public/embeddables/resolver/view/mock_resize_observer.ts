/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class MockResizeObserver implements ResizeObserver {
  static instances: Set<MockResizeObserver> = new Set();
  static contentRects: Map<Element, DOMRect> = new Map();
  static simulateElementResize: (target: Element, contentRect: DOMRect) => void = (
    target,
    contentRect
  ) => {
    MockResizeObserver.contentRects.set(target, contentRect);
    for (const instance of MockResizeObserver.instances) {
      instance.simulateElementResize(target, contentRect);
    }
  };
  static contentRectForElement: (target: Element) => DOMRect = target => {
    if (MockResizeObserver.contentRects.has(target)) {
      return MockResizeObserver.contentRects.get(target)!;
    }
    const domRect: DOMRect = {
      x: 0,
      y: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      toJSON() {
        return this;
      },
    };
    return domRect;
  };
  constructor(private readonly callback: ResizeObserverCallback) {
    MockResizeObserver.instances.add(this);
  }
  private elements: Set<Element> = new Set();
  simulateElementResize(target: Element, contentRect: DOMRect) {
    if (this.elements.has(target)) {
      const entries: ResizeObserverEntry[] = [{ target, contentRect }];
      this.callback(entries, this);
    }
  }
  observe(target: Element) {
    this.elements.add(target);
  }
  unobserve(target: Element) {
    this.elements.delete(target);
  }
  disconnect() {
    this.elements.clear();
  }
}
