/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CreatedBy, UpdatedBy } from '.';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';

describe('Rule related info', () => {
  describe('<CreatedBy />', () => {
    it('should render created correctly when by and date are passed', () => {
      const { getByTestId } = render(
        <TestProviders>
          <CreatedBy
            createdBy="test"
            createdAt="2023-01-01T22:01:00.000Z"
            data-test-subj="createdBy"
          />
        </TestProviders>
      );
      expect(getByTestId('createdBy')).toHaveTextContent(
        'Created by: test on Jan 1, 2023 @ 22:01:00.000'
      );
    });

    it('should render created unknown when created by is not available', () => {
      const { getByTestId } = render(
        <TestProviders>
          <CreatedBy createdAt="2023-01-01T22:01:00.000Z" data-test-subj="createdBy" />
        </TestProviders>
      );
      expect(getByTestId('createdBy')).toHaveTextContent(
        'Created by: Unknown on Jan 1, 2023 @ 22:01:00.000'
      );
    });
  });
  describe('<UpdatedBy />', () => {
    it('should render updated by correctly when by and date are passed', () => {
      const { getByTestId } = render(
        <TestProviders>
          <UpdatedBy
            updatedBy="test"
            updatedAt="2023-01-01T22:01:00.000Z"
            data-test-subj="updatedBy"
          />
        </TestProviders>
      );
      expect(getByTestId('updatedBy')).toHaveTextContent(
        'Updated by: test on Jan 1, 2023 @ 22:01:00.000'
      );
    });

    it('should render updated by correctly when updated by is not available', () => {
      const { getByTestId } = render(
        <TestProviders>
          <UpdatedBy updatedAt="2023-01-01T22:01:00.000Z" data-test-subj="updatedBy" />
        </TestProviders>
      );
      expect(getByTestId('updatedBy')).toHaveTextContent(
        'Updated by: Unknown on Jan 1, 2023 @ 22:01:00.000'
      );
    });
  });
});
