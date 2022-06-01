/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Mocks the React DOM module to ensure compatibility with react-testing-library and avoid
 * error like:
 *
 * ```
 * TypeError: parentInstance.children.indexOf is not a function
 *       at appendChild (node_modules/react-test-renderer/cjs/react-test-renderer.development.js:7183:39)
 * ```
 *
 * For more information on this need, see:
 *
 * @see https://github.com/facebook/react/issues/11565
 *
 * @example
 *
 * jest.mock('react-dom', () => {
 *   return jest
 *     .requireActual('../path/to/this/react_dom.mocks')
 *     .getReactDomMock();
 * });
 */
export const getReactDomMock = () => {
  const realReactDomModule = jest.requireActual('react-dom');

  return {
    ...realReactDomModule,

    createPortal: jest.fn((...args) => {
      realReactDomModule.createPortal(...args);
      // Needed for react-Test-library. See:
      // https://github.com/facebook/react/issues/11565
      return args[0];
    }),
  };
};
