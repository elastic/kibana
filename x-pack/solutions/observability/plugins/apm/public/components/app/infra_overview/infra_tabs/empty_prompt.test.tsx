/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { renderWithContext } from '../../../../utils/test_helpers';
import { EmptyPrompt } from './empty_prompt';

describe('EmptyPrompt', () => {
  it('shows infrastructure guidance with a docs link', () => {
    const { container } = renderWithContext(<EmptyPrompt />);

    expect(screen.getByText('There is no data to display.')).toBeInTheDocument();
    expect(container).toHaveTextContent(
      /Try modifying your filter and ensure the infrastructure your service runs on is supported/
    );
    expect(
      screen.getByTestId('apmInfraTabsEmptyPromptSupportedInfrastructureLink')
    ).toHaveAttribute(
      'href',
      'https://www.elastic.co/docs/solutions/observability/apm/infrastructure#observability-apm-infrastructure-elastic-apm'
    );
  });
});
