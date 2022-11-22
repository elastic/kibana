/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import { useDraggableKeyboardWrapper } from '.';

jest.mock('../../../lib/kibana');

describe('useDraggableKeyboardWrapper', () => {
  test('it renders against the snapshot', () => {
    const keyboardHandlerRef = useRef<HTMLDivElement | null>(null);
    const res = useDraggableKeyboardWrapper({
      closePopover: jest.fn(),
      draggableId: 'test',
      fieldName: 'field1',
      keyboardHandlerRef,
      openPopover: jest.fn(),
    });
    expect(res).toBe({});
  });
});
