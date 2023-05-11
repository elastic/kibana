/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const originalGetComputedStyle = Object.assign({}, window.getComputedStyle);

beforeAll(() => {
  // The JSDOM implementation is too slow
  // Especially for dropdowns that try to position themselves
  // perf issue - https://github.com/jsdom/jsdom/issues/3234
  Object.defineProperty(window, 'getComputedStyle', {
    value: (el: HTMLElement) => {
      /**
       * This is based on the jsdom implementation of getComputedStyle
       * https://github.com/jsdom/jsdom/blob/9dae17bf0ad09042cfccd82e6a9d06d3a615d9f4/lib/jsdom/browser/Window.js#L779-L820
       *
       * It is missing global style parsing and will only return styles applied directly to an element.
       * Will not return styles that are global or from emotion
       */
      const declaration = new CSSStyleDeclaration();
      const { style } = el;

      Array.prototype.forEach.call(style, (property: string) => {
        declaration.setProperty(
          property,
          style.getPropertyValue(property),
          style.getPropertyPriority(property)
        );
      });

      return declaration;
    },
    configurable: true,
    writable: true,
  });
});

afterAll(() => {
  Object.defineProperty(window, 'getComputedStyle', originalGetComputedStyle);
});
