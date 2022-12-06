/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KeyboardEvent, MouseEvent } from 'react';

export const disableEventDefaults = (event: KeyboardEvent | MouseEvent<SVGElement>) => {
  event.preventDefault();
  event.stopPropagation();
};

export const focusNextElement = (
  event: KeyboardEvent,
  selector: string,
  direction: 'prev' | 'next'
) => {
  const list = Array.from(document.querySelectorAll(selector));
  const currentIndex = list.indexOf(event.currentTarget);
  if (currentIndex > -1) {
    const nextButton = list[currentIndex + (direction === 'next' ? +1 : -1)] as HTMLElement;
    if (nextButton) {
      disableEventDefaults(event);
      nextButton.focus();
    }
  }
};
