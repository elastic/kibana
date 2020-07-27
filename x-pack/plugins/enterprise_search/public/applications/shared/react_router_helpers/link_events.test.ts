/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { letBrowserHandleEvent } from '../react_router_helpers';

describe('letBrowserHandleEvent', () => {
  const event = {
    defaultPrevented: false,
    metaKey: false,
    altKey: false,
    ctrlKey: false,
    shiftKey: false,
    button: 0,
    target: {
      getAttribute: () => '_self',
    },
  } as any;

  describe('the browser should handle the link when', () => {
    it('default is prevented', () => {
      expect(letBrowserHandleEvent({ ...event, defaultPrevented: true })).toBe(true);
    });

    it('is modified with metaKey', () => {
      expect(letBrowserHandleEvent({ ...event, metaKey: true })).toBe(true);
    });

    it('is modified with altKey', () => {
      expect(letBrowserHandleEvent({ ...event, altKey: true })).toBe(true);
    });

    it('is modified with ctrlKey', () => {
      expect(letBrowserHandleEvent({ ...event, ctrlKey: true })).toBe(true);
    });

    it('is modified with shiftKey', () => {
      expect(letBrowserHandleEvent({ ...event, shiftKey: true })).toBe(true);
    });

    it('it is not a left click event', () => {
      expect(letBrowserHandleEvent({ ...event, button: 2 })).toBe(true);
    });

    it('the target is anything value other than _self', () => {
      expect(
        letBrowserHandleEvent({
          ...event,
          target: targetValue('_blank'),
        })
      ).toBe(true);
    });
  });

  describe('the browser should NOT handle the link when', () => {
    it('default is not prevented', () => {
      expect(letBrowserHandleEvent({ ...event, defaultPrevented: false })).toBe(false);
    });

    it('is not modified', () => {
      expect(
        letBrowserHandleEvent({
          ...event,
          metaKey: false,
          altKey: false,
          ctrlKey: false,
          shiftKey: false,
        })
      ).toBe(false);
    });

    it('it is a left click event', () => {
      expect(letBrowserHandleEvent({ ...event, button: 0 })).toBe(false);
    });

    it('the target is a value of _self', () => {
      expect(
        letBrowserHandleEvent({
          ...event,
          target: targetValue('_self'),
        })
      ).toBe(false);
    });

    it('the target has no value', () => {
      expect(
        letBrowserHandleEvent({
          ...event,
          target: targetValue(null),
        })
      ).toBe(false);
    });
  });
});

const targetValue = (value: string | null) => {
  return {
    getAttribute: () => value,
  };
};
