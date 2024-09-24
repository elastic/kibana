/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Add stuff here
import { TestProviders } from '../../../common/mock';
import { render } from '@testing-library/react';
import React from 'react';
import { MisconfigurationsPreview } from './misconfiguration_preview';

const mockProps: { name: string; fieldName: 'host.name' | 'user.name' } = {
  name: 'testContextID',
  fieldName: 'host.name',
};

describe('MisconfigurationsPreview', () => {
  it('renders', () => {
    const { queryByTestId } = render(<MisconfigurationsPreview {...mockProps} />, {
      wrapper: TestProviders,
    });
    expect(
      queryByTestId('securitySolutionFlyoutInsightsMisconfigurationsContent')
    ).toBeInTheDocument();
    expect(queryByTestId('noFindingsDataTestSubj')).toBeInTheDocument();
  });
});
