/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KbnServer, Size } from '../../../../../types';
import { LayoutTypes } from '../../../common/constants';
import { Layout } from './layout';
import { PreserveLayout } from './preserve_layout';
import { PrintLayout } from './print_layout';

interface LayoutParams {
  id: string;
  dimensions: Size;
}

export function createLayout(server: KbnServer, layoutParams: LayoutParams): Layout {
  if (layoutParams && layoutParams.id === LayoutTypes.PRESERVE_LAYOUT) {
    return new PreserveLayout(layoutParams.id, layoutParams.dimensions);
  }

  // this is the default because some jobs won't have anything specified
  return new PrintLayout(server, layoutParams.id);
}
