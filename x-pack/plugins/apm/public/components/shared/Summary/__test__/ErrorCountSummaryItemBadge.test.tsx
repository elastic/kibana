/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ErrorCountSummaryItemBadge } from '../ErrorCountSummaryItemBadge';
import { render } from '@testing-library/react';
import { expectTextsInDocument } from '../../../../utils/testHelpers';

describe('ErrorCountSummaryItemBadge', () => {
  it('shows singular error message', () => {
    const component = render(<ErrorCountSummaryItemBadge count={1} />);
    expectTextsInDocument(component, ['1 Error']);
  });
  it('shows plural error message', () => {
    const component = render(<ErrorCountSummaryItemBadge count={2} />);
    expectTextsInDocument(component, ['2 Errors']);
  });
});
