/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ErrorCountSummaryItemBadge } from './error_count_summary_item_badge';
import {
  expectTextsInDocument,
  renderWithTheme,
} from '../../../utils/test_helpers';

describe('ErrorCountSummaryItemBadge', () => {
  it('shows singular error message', () => {
    const component = renderWithTheme(<ErrorCountSummaryItemBadge count={1} />);
    expectTextsInDocument(component, ['1 Error']);
  });

  it('shows plural error message', () => {
    const component = renderWithTheme(<ErrorCountSummaryItemBadge count={2} />);
    expectTextsInDocument(component, ['2 Errors']);
  });
});
