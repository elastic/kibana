/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * jsdom does not implement what rrweb relies on to accept its replay iframe and to scroll it.
 * These helpers add the minimum so real rrweb can run in Jest; they do not change rrweb's own
 * checks, which read the `sandbox` attribute rrweb itself sets.
 */

/** Gives `HTMLIFrameElement` a `sandbox` property that lists the tokens of the attribute. */
export const installIframeSandboxProperty = (): void => {
  if ('sandbox' in HTMLIFrameElement.prototype) {
    return;
  }
  Object.defineProperty(HTMLIFrameElement.prototype, 'sandbox', {
    configurable: true,
    get(this: HTMLIFrameElement) {
      return (this.getAttribute('sandbox') ?? '').split(/\s+/).filter(Boolean);
    },
  });
};

/** Hides the console errors jsdom prints for `window.scrollTo`, which rrweb calls on a timer. */
export const silenceJsdomScrollErrors = (): jest.SpyInstance => {
  const original = console.error;
  return jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = args[0] instanceof Error ? args[0].message : String(args[0]);
    if (message.includes('Not implemented')) {
      return;
    }
    original(...args);
  });
};
