/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Forces the `offsetWidth` of `HTMLElement` to a given value. Needed due to the use of
 * `react-virtualized-auto-sizer` by the eui `Selectable` component
 *
 * @param [width=100]
 * @returns reset(): void
 *
 * @example
 * const resetEnv = forceHTMLElementOffsetWidth();
 * //... later
 * resetEnv();
 */
export const forceHTMLElementOffsetWidth = (width: number = 100): (() => void) => {
  const currentOffsetDefinition = Object.getOwnPropertyDescriptor(
    window.HTMLElement.prototype,
    'offsetWidth'
  );

  Object.defineProperties(window.HTMLElement.prototype, {
    offsetWidth: {
      ...(currentOffsetDefinition || {}),
      get() {
        return width;
      },
    },
  });

  return function reset() {
    if (currentOffsetDefinition) {
      Object.defineProperties(window.HTMLElement.prototype, {
        offsetWidth: {
          ...(currentOffsetDefinition || {}),
        },
      });
    }
  };
};
