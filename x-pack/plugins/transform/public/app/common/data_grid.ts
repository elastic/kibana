/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDataGridStyle } from '@elastic/eui';

export const euiDataGridStyle: EuiDataGridStyle = {
  border: 'all',
  fontSize: 's',
  cellPadding: 's',
  stripes: false,
  rowHover: 'highlight',
  header: 'shade',
};

export const euiDataGridToolbarSettings = {
  showColumnSelector: true,
  showStyleSelector: false,
  showSortSelector: true,
  showFullScreenSelector: false,
};
