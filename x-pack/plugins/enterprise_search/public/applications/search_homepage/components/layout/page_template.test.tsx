/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TestHelper } from '../../../test_helpers/test_utils.test_helper';

import { SearchHomepagePageTemplate } from './page_template';

describe('SearchHomepagePageTemplate', () => {
  beforeAll(() => {
    TestHelper.prepare();
  });

  it('renders as expected', async () => {
    const { container } = TestHelper.render(
      <SearchHomepagePageTemplate>
        <div>Test</div>
      </SearchHomepagePageTemplate>
    );

    expect(container.querySelector('.kbnSolutionNav__title')).toHaveTextContent('Search');
  });
});
