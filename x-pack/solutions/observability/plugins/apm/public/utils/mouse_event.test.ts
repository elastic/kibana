/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import { isLeftClick, isModifiedClick } from './mouse_event';

const createMouseEvent = (overrides: Partial<MouseEvent> = {}) =>
  ({
    button: 0,
    metaKey: false,
    altKey: false,
    ctrlKey: false,
    shiftKey: false,
    ...overrides,
  } as MouseEvent);

describe('isModifiedClick', () => {
  it('returns false when no modifier key is pressed', () => {
    expect(isModifiedClick(createMouseEvent())).toBe(false);
  });

  it.each(['metaKey', 'altKey', 'ctrlKey', 'shiftKey'] as const)(
    'returns true when %s is pressed',
    (modifier) => {
      expect(isModifiedClick(createMouseEvent({ [modifier]: true }))).toBe(true);
    }
  );
});

describe('isLeftClick', () => {
  it('returns true for the primary (left) button', () => {
    expect(isLeftClick(createMouseEvent({ button: 0 }))).toBe(true);
  });

  it('returns false for the middle button', () => {
    expect(isLeftClick(createMouseEvent({ button: 1 }))).toBe(false);
  });

  it('returns false for the right button', () => {
    expect(isLeftClick(createMouseEvent({ button: 2 }))).toBe(false);
  });
});
