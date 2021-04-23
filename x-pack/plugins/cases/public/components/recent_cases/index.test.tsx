/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { configure, getByTestId, render } from '@testing-library/react';
import RecentCases from '.';

configure({ testIdAttribute: 'data-test-subj' });
const defaultProps = {
  allCasesNavigation: {
    href: 'all-cases-href',
    onClick: jest.fn(),
  },
  caseDetailsNavigation: {
    href: () => 'case-details-href',
    onClick: jest.fn(),
  },
  createCaseNavigation: {
    href: 'create-details-href',
    onClick: jest.fn(),
  },
  maxCasesToShow: 10,
};

describe('RecentCases', () => {
  it('renders', () => {
    render(<RecentCases {...defaultProps} />);
    const thisItem = getByTestId('wowzeroni');
    console.log('getByTestId', thisItem);
  });
});
