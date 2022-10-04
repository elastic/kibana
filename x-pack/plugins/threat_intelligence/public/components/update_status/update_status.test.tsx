/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProvidersComponent } from '../../common/mocks/test_providers';
import { UpdateStatus } from './update_status';

describe('<UpdateStatus />', () => {
  it('should render Updated now', () => {
    const result = render(<UpdateStatus updatedAt={Date.now()} isUpdating={false} />, {
      wrapper: TestProvidersComponent,
    });

    expect(result.asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="euiFlexGroup euiFlexGroup--gutterLarge euiFlexGroup--directionRow euiFlexGroup--responsive"
        >
          <div
            class="euiFlexItem euiFlexItem--flexGrowZero"
          >
            <div
              class="euiText emotion-euiText-xs-euiTextColor-subdued"
              data-test-subj="updateStatus"
            >
              Updated now
            </div>
          </div>
        </div>
      </DocumentFragment>
    `);
  });

  it('should render Updating when isUpdating', () => {
    const result = render(<UpdateStatus updatedAt={Date.now()} isUpdating={true} />, {
      wrapper: TestProvidersComponent,
    });

    expect(result.asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="euiFlexGroup euiFlexGroup--gutterLarge euiFlexGroup--directionRow euiFlexGroup--responsive"
        >
          <div
            class="euiFlexItem euiFlexItem--flexGrowZero"
          >
            <div
              class="euiText emotion-euiText-xs-euiTextColor-subdued"
              data-test-subj="updateStatus"
            >
              Updating...
            </div>
          </div>
        </div>
      </DocumentFragment>
    `);
  });
});
