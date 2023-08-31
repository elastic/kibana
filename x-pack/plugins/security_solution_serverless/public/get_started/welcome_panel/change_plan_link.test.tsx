/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect'; // For DOM matchers like toBeInTheDocument
import { ChangePlanLink } from './change_plan_link'; // Replace with your import path
import { ProductTier } from '../../../common/product';

jest.mock('../../common/services', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      cloud: {
        projectsUrl: 'https://cloud.elastic.co/projects',
      },
    },
  }),
}));

describe('ChangePlanLink', () => {
  it('renders nothing when productTier is undefined', () => {
    const { container } = render(<ChangePlanLink productTier={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the link and badge when productTier is defined', () => {
    const { getByText, getByTestId } = render(
      <ChangePlanLink productTier={ProductTier.complete} />
    );
    const badge = getByTestId('product-tier-badge');
    const link = getByText('Change plan');
    expect(badge).toBeInTheDocument();
    expect(link).toBeInTheDocument();
  });

  it('does not render badge when productTier is defined', () => {
    const { queryByTestId } = render(<ChangePlanLink productTier={undefined} />);
    const badge = queryByTestId('product-tier-badge');
    expect(badge).not.toBeInTheDocument();
  });
});
