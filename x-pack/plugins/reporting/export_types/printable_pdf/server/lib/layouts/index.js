/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LayoutTypes } from '../../../common/constants';
import { preserveLayoutFactory } from './preserve_layout';
import { printLayoutFactory } from './print';

export function getLayoutFactory(server) {
  return function getLayout(layoutParams) {
    if (layoutParams && layoutParams.id === LayoutTypes.PRESERVE_LAYOUT) {
      return preserveLayoutFactory(server, layoutParams);
    }

    // this is the default because some jobs won't have anything specified
    return printLayoutFactory(server, layoutParams);
  };
}
