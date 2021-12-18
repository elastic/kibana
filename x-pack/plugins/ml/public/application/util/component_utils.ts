/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MouseEvent } from 'react';

/**
 * Removes focus from a button element when clicked, for example to
 * ensure a wrapping tooltip is hidden on click.
 */
export const blurButtonOnClick = (callback: Function) => (event: MouseEvent<HTMLButtonElement>) => {
  (event.target as HTMLButtonElement).blur();
  callback();
};
