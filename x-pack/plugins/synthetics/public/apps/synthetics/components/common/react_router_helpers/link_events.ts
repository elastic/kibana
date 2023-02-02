/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MouseEvent } from 'react';

/**
 * Helper functions for determining which events we should
 * let browsers handle natively, e.g. new tabs/windows
 */

type THandleEvent = (event: MouseEvent) => boolean;

export const letBrowserHandleEvent: THandleEvent = (event) =>
  event.defaultPrevented ||
  isModifiedEvent(event) ||
  !isLeftClickEvent(event) ||
  isTargetBlank(event);

const isModifiedEvent: THandleEvent = (event) =>
  !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

const isLeftClickEvent: THandleEvent = (event) => event.button === 0;

const isTargetBlank: THandleEvent = (event) => {
  const element = event.target as HTMLElement;
  const target = element.getAttribute('target');
  return !!target && target !== '_self';
};
