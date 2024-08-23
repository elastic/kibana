/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '../../../../common/mock';
import { render } from '@testing-library/react';
import React from 'react';
import { ManagedUserAccordion } from './managed_user_accordion';
import { mockEntraUserFields } from '../mocks';
import { UserAssetTableType } from '../../../../explore/users/store/model';

describe('ManagedUserAccordion', () => {
  it('it renders children', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ManagedUserAccordion
          title="test title"
          managedUser={mockEntraUserFields}
          tableType={UserAssetTableType.assetEntra}
          openDetailsPanel={() => {}}
        >
          <div data-test-subj="test-children" />
        </ManagedUserAccordion>
      </TestProviders>
    );

    expect(getByTestId('test-children')).toBeInTheDocument();
  });
});
