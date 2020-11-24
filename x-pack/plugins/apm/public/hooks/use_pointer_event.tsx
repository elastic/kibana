/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';
import { PointerEventContext } from '../context/pointer_event_context';

export function usePointerEvent() {
  const context = useContext(PointerEventContext);

  if (!context) {
    throw new Error('Missing PointerEventContext provider');
  }

  return context;
}
