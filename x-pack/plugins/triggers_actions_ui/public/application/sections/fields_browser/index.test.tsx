/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';

import { FIELD_BROWSER_WIDTH } from './helpers';

import { StatefulFieldsBrowserComponent } from '.';
import { mockBrowserFields } from './mock';
import { mountWithIntl } from '@kbn/test-jest-helpers';

describe('StatefulFieldsBrowser', () => {
  it('should render the Fields button, which displays the fields browser on click', () => {
    const result = mountWithIntl(
      <StatefulFieldsBrowserComponent
        browserFields={mockBrowserFields}
        columnIds={[]}
        width={FIELD_BROWSER_WIDTH}
        onToggleColumn={jest.fn()}
        onUpdateColumns={jest.fn()}
      />
    );

    expect(result.find('[data-test-subj="show-field-browser"]')).toBeInTheDocument();
  });

  describe('toggleShow', () => {
    it('should NOT render the fields browser until the Fields button is clicked', () => {
      const result = mountWithIntl(
        <StatefulFieldsBrowserComponent
          browserFields={mockBrowserFields}
          columnIds={[]}
          onToggleColumn={jest.fn()}
          onUpdateColumns={jest.fn()}
        />
      );

      expect(result.find('[data-test-subj="fields-browser-container"]')).toBeNull();
    });

    it('should render the fields browser when the Fields button is clicked', async () => {
      const result = mountWithIntl(
        <StatefulFieldsBrowserComponent
          browserFields={mockBrowserFields}
          columnIds={[]}
          onToggleColumn={jest.fn()}
          onUpdateColumns={jest.fn()}
        />
      );
      result.find('[data-test-subj="show-field-browser"]').first().simulate('click');
      await waitFor(() => {
        expect(result.find('[data-test-subj="fields-browser-container"]')).toBeInTheDocument();
      });
    });
  });

  describe('updateSelectedCategoryIds', () => {
    it('should add a selected category, which creates the category badge', async () => {
      const result = mountWithIntl(
        <StatefulFieldsBrowserComponent
          browserFields={mockBrowserFields}
          columnIds={[]}
          onToggleColumn={jest.fn()}
          onUpdateColumns={jest.fn()}
        />
      );

      result.find('[data-test-subj="show-field-browser"]').first().simulate('click');
      await waitFor(() => {
        expect(result.find('[data-test-subj="fields-browser-container"]')).toBeInTheDocument();
      });

      await act(async () => {
        result.find('[data-test-subj="categories-filter-button"]').first().simulate('click');
      });
      await act(async () => {
        result.find('[data-test-subj="categories-selector-option-base"]').first().simulate('click');
      });

      expect(result.find('[data-test-subj="category-badge-base"]')).toBeInTheDocument();
    });

    it('should remove a selected category, which deletes the category badge', async () => {
      const result = mountWithIntl(
        <StatefulFieldsBrowserComponent
          browserFields={mockBrowserFields}
          columnIds={[]}
          onToggleColumn={jest.fn()}
          onUpdateColumns={jest.fn()}
        />
      );

      result.find('[data-test-subj="show-field-browser"]').first().simulate('click');
      await waitFor(() => {
        expect(result.find('[data-test-subj="fields-browser-container"]')).toBeInTheDocument();
      });

      await act(async () => {
        result.find('[data-test-subj="categories-filter-button"]').first().simulate('click');
      });
      await act(async () => {
        result.find('[data-test-subj="categories-selector-option-base"]').first().simulate('click');
      });
      expect(result.find('[data-test-subj="category-badge-base"]')).toBeInTheDocument();

      await act(async () => {
        result.find('[data-test-subj="category-badge-unselect-base"]').first().simulate('click');
      });
      expect(result.find('[data-test-subj="category-badge-base"]')).toBeNull();
    });

    it('should update the available categories according to the search input', async () => {
      const result = mountWithIntl(
        <StatefulFieldsBrowserComponent
          browserFields={mockBrowserFields}
          columnIds={[]}
          onToggleColumn={jest.fn()}
          onUpdateColumns={jest.fn()}
        />
      );

      result.find('[data-test-subj="show-field-browser"]').first().simulate('click');
      await waitFor(() => {
        expect(result.find('[data-test-subj="fields-browser-container"]')).toBeInTheDocument();
      });

      result.find('[data-test-subj="categories-filter-button"]').first().simulate('click');
      expect(result.find('[data-test-subj="categories-selector-option-base"]')).toBeInTheDocument();

      fireEvent.change(result.find('[data-test-subj="field-search"]').first().getDOMNode(), {
        target: { value: 'client' },
      });
      await waitFor(() => {
        expect(result.find('[data-test-subj="categories-selector-option-base"]')).toBeNull();
      });
      expect(
        result.find('[data-test-subj="categories-selector-option-client"]')
      ).toBeInTheDocument();
    });
  });
});
