/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, wait } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import { SearchItems } from '../../hooks/use_search_items';

import { useIndexData } from './use_index_data';
import { IndexPreview } from './index_preview';

jest.mock('../../../shared_imports');
jest.mock('../../app_dependencies');

describe('Transform: <IndexPreview />', () => {
  // Using the async/await wait()/done() pattern to avoid act() errors.
  test('Minimal initialization', async done => {
    // Arrange
    const indexPattern = {
      title: 'the-index-pattern-title',
      fields: [] as any[],
    } as SearchItems['indexPattern'];

    const Wrapper = () => {
      const props = {
        ...useIndexData(indexPattern, { match_all: {} }),
        title: 'the-index-preview-title',
        copyToClipboard: 'the-copy-to-clipboard-code',
        copyToClipboardDescription: 'the-copy-to-clipboard-description',
        dataTestSubj: 'the-data-test-subj',
      };

      return <IndexPreview {...props} />;
    };
    const { getByText } = render(<Wrapper />);

    // Act
    // Assert
    expect(getByText('the-index-preview-title')).toBeInTheDocument();
    await wait();
    done();
  });
});
