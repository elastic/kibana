/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const applyIntersectionObserverMock = () => {
  // @ts-expect-error `.mock` is not part of IntersectionObserver
  if (!window.IntersectionObserver || window.IntersectionObserver.mock) {
    // IntersectionObserver isn't available in Jest environment
    // @ts-expect-error
    window.IntersectionObserver = jest.fn(() => {
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
    }) as unknown as jest.Mocked<IntersectionObserver>;
  }
};
