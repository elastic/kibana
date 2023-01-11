/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VIEW_SELECTION } from '../../components/events_viewer/summary_view_select';
import type { AlertTableModel } from './types';

export const defaultAlertTableModel: AlertTableModel = {
  totalCount: 0,
  viewMode: VIEW_SELECTION.gridView,
  isLoading: false,
};
