/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class MockResizeObserver implements ResizeObserver {
  private elements: Set<Element> = new Set();

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
