/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HorizontalAlignment } from '@elastic/eui';
import * as i18n from './translations';

/**
 * Rules columns for EuiInMemoryTable
 */
export const getRulesTableColumn = () => [
  {
    field: 'name',
    align: 'left' as HorizontalAlignment,
    name: i18n.NAME_COLUMN,
    sortable: true,
    'data-test-subj': 'ruleNameCell',
    truncateText: false,
  },
];
