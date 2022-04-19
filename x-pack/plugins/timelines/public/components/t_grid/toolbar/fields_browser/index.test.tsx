/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';

import { mockBrowserFields, TestProviders } from '../../../../mock';

import { FIELD_BROWSER_WIDTH } from './helpers';

import { StatefulFieldsBrowserComponent } from '.';

describe('StatefulFieldsBrowser', () => {
  const timelineId = 'test';

  it('should render the Fields button, which displays the fields browser on click', () => {
    const result = render(
      <TestProviders>
        <StatefulFieldsBrowserComponent
          browserFields={mockBrowserFields}
          columnHeaders={[]}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(result.getByTestId('show-field-browser')).toBeInTheDocument();
  });

  describe('toggleShow', () => {
    it('should NOT render the fields browser until the Fields button is clicked', () => {
      const result = render(
        <TestProviders>
          <StatefulFieldsBrowserComponent
            browserFields={mockBrowserFields}
            columnHeaders={[]}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(result.queryByTestId('fields-browser-container')).toBeNull();
    });

    it('should render the fields browser when the Fields button is clicked', async () => {
      const result = render(
        <TestProviders>
          <StatefulFieldsBrowserComponent
            browserFields={mockBrowserFields}
            columnHeaders={[]}
            timelineId={timelineId}
          />
        </TestProviders>
      );
      result.getByTestId('show-field-browser').click();
      await waitFor(() => {
        expect(result.getByTestId('fields-browser-container')).toBeInTheDocument();
      });
    });
  });

  describe('updateSelectedCategoryIds', () => {
    it('should add a selected category, which creates the category badge', async () => {
      const result = render(
        <TestProviders>
          <StatefulFieldsBrowserComponent
            browserFields={mockBrowserFields}
            columnHeaders={[]}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      result.getByTestId('show-field-browser').click();
      await waitFor(() => {
        expect(result.getByTestId('fields-browser-container')).toBeInTheDocument();
      });

      await act(async () => {
        result.getByTestId('categories-filter-button').click();
      });
      await act(async () => {
        result.getByTestId('categories-selector-option-base').click();
      });

      expect(result.getByTestId('category-badge-base')).toBeInTheDocument();
    });

    it('should remove a selected category, which deletes the category badge', async () => {
      const result = render(
        <TestProviders>
          <StatefulFieldsBrowserComponent
            browserFields={mockBrowserFields}
            columnHeaders={[]}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      result.getByTestId('show-field-browser').click();
      await waitFor(() => {
        expect(result.getByTestId('fields-browser-container')).toBeInTheDocument();
      });

      await act(async () => {
        result.getByTestId('categories-filter-button').click();
      });
      await act(async () => {
        result.getByTestId('categories-selector-option-base').click();
      });
      expect(result.getByTestId('category-badge-base')).toBeInTheDocument();

      await act(async () => {
        result.getByTestId('category-badge-unselect-base').click();
      });
      expect(result.queryByTestId('category-badge-base')).toBeNull();
    });

    it('should update the available categories according to the search input', async () => {
      const result = render(
        <TestProviders>
          <StatefulFieldsBrowserComponent
            browserFields={mockBrowserFields}
            columnHeaders={[]}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      result.getByTestId('show-field-browser').click();
      await waitFor(() => {
        expect(result.getByTestId('fields-browser-container')).toBeInTheDocument();
      });

      result.getByTestId('categories-filter-button').click();
      expect(result.getByTestId('categories-selector-option-base')).toBeInTheDocument();

      fireEvent.change(result.getByTestId('field-search'), { target: { value: 'client' } });
      await waitFor(() => {
        expect(result.queryByTestId('categories-selector-option-base')).toBeNull();
      });
      expect(result.queryByTestId('categories-selector-option-client')).toBeInTheDocument();
    });
  });

  it('should render the Fields Browser button as a settings gear when the isEventViewer prop is true', () => {
    const isEventViewer = true;

    const result = render(
      <TestProviders>
        <StatefulFieldsBrowserComponent
          browserFields={mockBrowserFields}
          columnHeaders={[]}
          isEventViewer={isEventViewer}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(result.getByTestId('show-field-browser')).toBeInTheDocument();
  });

  it('should render the Fields Browser button as a settings gear when the isEventViewer prop is false', () => {
    const isEventViewer = false;

    const result = render(
      <TestProviders>
        <StatefulFieldsBrowserComponent
          browserFields={mockBrowserFields}
          columnHeaders={[]}
          isEventViewer={isEventViewer}
          timelineId={timelineId}
          width={FIELD_BROWSER_WIDTH}
        />
      </TestProviders>
    );

    expect(result.getByTestId('show-field-browser')).toBeInTheDocument();
  });
});
