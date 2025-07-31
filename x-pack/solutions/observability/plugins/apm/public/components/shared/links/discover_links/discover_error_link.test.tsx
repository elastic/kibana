/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import { DiscoverErrorLink } from './discover_error_link';
import { renderWithContext } from '../../../../utils/test_helpers';

jest.mock('../../../../hooks/use_adhoc_apm_data_view', () => ({
  useAdHocApmDataView: () => ({
    dataView: {
      id: 'apm_0',
      title: 'apm_0',
    },
  }),
}));

describe('DiscoverErrorLink', () => {
  const mockError: APMError = {
    service: { name: 'myServiceName' },
    error: { grouping_key: 'myGroupingKey' },
  } as APMError;

  it('should render with correct query without kuery', () => {
    renderWithContext(<DiscoverErrorLink error={mockError} />);

    const link = screen.getByTestId('apmDiscoverLinkLink');
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('service.name:"myServiceName" AND error.grouping_key:"myGroupingKey"')
    );
  });

  it('should render with correct query with kuery', () => {
    const kuery = 'transaction.sampled: true';

    renderWithContext(<DiscoverErrorLink error={mockError} kuery={kuery} />);

    const link = screen.getByTestId('apmDiscoverLinkLink');
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining(
        'service.name:"myServiceName" AND error.grouping_key:"myGroupingKey" AND transaction.sampled: true'
      )
    );
  });
});
