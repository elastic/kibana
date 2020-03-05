/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import { getAppProviders } from '../../../../app_dependencies';
import { getPivotQuery } from '../../../../common';
import { SearchItems } from '../../../../hooks/use_search_items';

import { SourceIndexPreview } from './source_index_preview';

jest.mock('ui/new_platform');
jest.mock('../../../../../shared_imports');

describe('Transform: <SourceIndexPreview />', () => {
  test('Minimal initialization', () => {
    // Arrange
    const props = {
      indexPattern: {
        title: 'the-index-pattern-title',
        fields: [] as any[],
      } as SearchItems['indexPattern'],
      query: getPivotQuery('the-query'),
    };
    const Providers = getAppProviders({});
    const { getByText } = render(
      <Providers>
        <SourceIndexPreview {...props} />
      </Providers>
    );

    // Act
    // Assert
    expect(getByText(`Source index ${props.indexPattern.title}`)).toBeInTheDocument();
  });
});
