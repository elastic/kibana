/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LayoutTypes } from '../../common/constants';

export const preserveLayout = {
  getJobParams() {
    const el = document.querySelector('[data-shared-items-container]');
    const bounds = el.getBoundingClientRect();

    return {
      id: LayoutTypes.PRESERVE_LAYOUT,
      dimensions: {
        height: bounds.height,
        width: bounds.width,
      }
    };
  }
};
