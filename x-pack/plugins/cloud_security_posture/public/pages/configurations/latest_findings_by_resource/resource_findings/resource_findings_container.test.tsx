/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { TestProvider } from '../../../../test/test_provider';
import { useResourceFindings } from './use_resource_findings';
import { FindingsBaseProps } from '../../../../common/types';
import { ResourceFindings } from './resource_findings_container';

jest.mock('./use_resource_findings', () => ({
  useResourceFindings: jest.fn().mockReturnValue({
    data: undefined,
    error: false,
  }),
}));

describe('<ResourceFindings />', () => {
  it('should fetch resources with the correct parameters', async () => {
    const props: FindingsBaseProps = {
      dataView: {} as any,
    };

    render(
      <TestProvider>
        <ResourceFindings {...props} />
      </TestProvider>
    );

    expect(useResourceFindings).toHaveBeenNthCalledWith(1, {
      enabled: true,
      query: {
        bool: {
          filter: [],
          must: [],
          must_not: [],
          should: [],
        },
      },
      resourceId: 'undefined',
      sort: {
        direction: 'asc',
        field: 'result.evaluation',
      },
    });
  });
});
