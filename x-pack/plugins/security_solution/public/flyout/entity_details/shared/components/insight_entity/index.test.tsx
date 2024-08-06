/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Add stuff here
import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../../common/mock';
import { InsightEntity } from '.';

const mockProps = {
  hostName: 'testContextID',
};

describe('InsightEntity', () => {
  it('renders', () => {
    const { queryByTestId } = render(<InsightEntity {...mockProps} />, {
      wrapper: TestProviders,
    });

    expect(queryByTestId('insightEntityTestSubj')).toBeInTheDocument();
  });
});
