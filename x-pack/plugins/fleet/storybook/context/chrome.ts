/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import type { ChromeStart } from 'kibana/public';

export const getChrome = () => {
  const chrome: ChromeStart = {
    docTitle: {
      change: action('Change Doc Title'),
      reset: action('Reset Doc Title'),
    },
    setBreadcrumbs: action('Set Breadcrumbs'),
  } as unknown as ChromeStart;

  return chrome;
};
