/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '../../../common/mock';
import { render } from '@testing-library/react';
import React from 'react';
import { VulnerabilitiesPreview } from './vulnerabilities_preview';

const mockProps: { hostName: string } = {
  hostName: 'testContextID',
};

describe('VulnerabilitiesPreview', () => {
  it('renders', () => {
    const { queryByTestId } = render(<VulnerabilitiesPreview {...mockProps} />, {
      wrapper: TestProviders,
    });
    expect(
      queryByTestId('securitySolutionFlyoutInsightsVulnerabilitiesContent')
    ).toBeInTheDocument();
    expect(queryByTestId('noVulnerabilitiesDataTestSubj')).toBeInTheDocument();
  });
});
