/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, wait } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import { getPivotQuery } from '../../../../common';
import { SearchItems } from '../../../../hooks/use_search_items';

import { SourceIndexPreview } from './source_index_preview';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../../app/app_dependencies');

describe('Transform: <SourceIndexPreview />', () => {
  // Using the async/await wait()/done() pattern to avoid act() errors.
  test('Minimal initialization', async (done) => {
    // Arrange
    const props = {
      indexPattern: {
        title: 'the-index-pattern-title',
        fields: [] as any[],
      } as SearchItems['indexPattern'],
      query: getPivotQuery('the-query'),
    };
    const { getByText } = render(<SourceIndexPreview {...props} />);

    // Act
    // Assert
    expect(getByText(`Source index ${props.indexPattern.title}`)).toBeInTheDocument();
    await wait();
    done();
  });
});
