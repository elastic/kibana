/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render } from '@testing-library/react'; // eslint-disable-line import/no-extraneous-dependencies
import { JobSelectorTable } from './job_selector_table';

jest.mock('../../../contexts/kibana');

const props = {
  ganttBarWidth: 299,
  groupsList: [
    {
      id: 'logs',
      jobIds: ['bytes-by-geo-dest', 'machine-ram-by-source'],
      timeRange: {
        fromPx: 15.1,
        label: 'Apr 20th 2019, 20: 39 to Jun 20th 2019, 17: 45',
        widthPx: 283.89,
      },
    },
    {
      id: 'ecommerce',
      jobIds: ['price-by-day'],
      timeRange: {
        fromPx: 1,
        label: 'Apr 17th 2019, 20:04 to May 18th 2019, 19:45',
        widthPx: 144.5,
      },
    },
    {
      id: 'flights',
      jobIds: ['price-by-dest-city'],
      timeRange: {
        fromPx: 19.6,
        label: 'Apr 21st 2019, 20:00 to Jun 2nd 2019, 19:50',
        widthPx: 195.8,
      },
    },
  ],
  jobs: [
    {
      groups: ['logs'],
      id: 'bytes-by-geo-dest',
      isRunning: false,
      isSingleMetricViewerJob: true,
      job_id: 'bytes-by-geo-dest',
      timeRange: {
        fromPx: 12.3,
        label: 'Apr 20th 2019, 20:39 to Jun 20th 2019, 17:45',
        widthPx: 228.6,
      },
    },
    {
      groups: ['logs'],
      id: 'machine-ram-by-source',
      isRunning: false,
      isSingleMetricViewerJob: true,
      job_id: 'machine-ram-by-source',
      timeRange: {
        fromPx: 10,
        label: 'Apr 20th 2019, 20:39 to Jun 20th 2019, 17:45',
        widthPx: 182.9,
      },
    },
    {
      groups: ['ecommerce'],
      id: 'price-by-day',
      isRunning: false,
      isSingleMetricViewerJob: true,
      job_id: 'price-by-day',
      timeRange: {
        fromPx: 1,
        label: 'Apr 17th 2019, 20:04 to May 18th 2019, 19:45',
        widthPx: 93.1,
      },
    },
    {
      groups: ['test'],
      id: 'non-timeseries-job',
      isRunning: false,
      isSingleMetricViewerJob: false,
      job_id: 'non-timeseries-job',
      timeRange: {
        fromPx: 1,
        label: 'Apr 17th 2019, 20:04 to May 18th 2019, 19:45',
        widthPx: 93.1,
      },
    },
  ],
  onSelection: jest.fn(),
  selectedIds: ['price-by-day'],
};

describe('JobSelectorTable', () => {
  describe('Single Selection', () => {
    test('Does not render tabs', () => {
      const singleSelectionProps = { ...props, singleSelection: true };
      const { queryByRole } = render(<JobSelectorTable {...singleSelectionProps} />);
      const tabs = queryByRole('tab');
      expect(tabs).toBeNull();
    });

    test('incoming selectedId is selected in the table', () => {
      const singleSelectionProps = { ...props, singleSelection: true };
      const { getByTestId } = render(<JobSelectorTable {...singleSelectionProps} />);
      const radioButton = getByTestId('price-by-day-radio-button');
      expect(radioButton.firstChild.checked).toEqual(true);
    });

    test('job cannot be selected if it is not a single metric viewer job', () => {
      const timeseriesOnlyProps = { ...props, singleSelection: true, timeseriesOnly: true };
      const { getByTestId } = render(<JobSelectorTable {...timeseriesOnlyProps} />);
      const radioButton = getByTestId('non-timeseries-job-radio-button');
      expect(radioButton.firstChild.disabled).toEqual(true);
    });
  });

  describe('Not Single Selection', () => {
    test('renders callout when no jobs provided', () => {
      const propsEmptyJobs = { ...props, jobs: [], groupsList: [] };
      const { getByText } = render(
        <I18nProvider>
          <JobSelectorTable {...propsEmptyJobs} />
        </I18nProvider>
      );
      const calloutMessage = getByText('No anomaly detection jobs found');
      const createJobButton = getByText('Create job');
      expect(createJobButton).toBeDefined();
      expect(calloutMessage).toBeDefined();
    });

    test('renders tabs when not singleSelection', () => {
      const { getAllByRole } = render(<JobSelectorTable {...props} />);
      const tabs = getAllByRole('tab');
      expect(tabs).toBeDefined();
    });

    test('toggles content when tabs clicked', () => {
      // Default is Jobs tab so select Groups tab
      const { getByText, getAllByText } = render(<JobSelectorTable {...props} />);
      const groupsTab = getByText('Groups');
      fireEvent.click(groupsTab);
      const groupsTableHeader = getAllByText('jobs in group');
      expect(groupsTableHeader).toBeDefined();
      // switch back to Jobs tab
      const jobsTab = getByText('Jobs');
      fireEvent.click(jobsTab);
      const jobsTableHeader = getAllByText('job ID');
      expect(jobsTableHeader).toBeDefined();
    });

    test('incoming selectedIds are checked in the table', () => {
      const { getByTestId } = render(<JobSelectorTable {...props} />);
      const checkbox = getByTestId('price-by-day-checkbox');
      expect(checkbox.checked).toEqual(true);
    });

    test('incoming selectedIds are checked in the table when multiple ids', () => {
      const multipleSelectedIdsProps = {
        ...props,
        selectedIds: ['price-by-day', 'bytes-by-geo-dest'],
      };
      const { getByTestId } = render(<JobSelectorTable {...multipleSelectedIdsProps} />);
      const priceByDayCheckbox = getByTestId('price-by-day-checkbox');
      const bytesByGeoCheckbox = getByTestId('bytes-by-geo-dest-checkbox');
      const unselectedCheckbox = getByTestId('machine-ram-by-source-checkbox');
      expect(priceByDayCheckbox.checked).toEqual(true);
      expect(bytesByGeoCheckbox.checked).toEqual(true);
      expect(unselectedCheckbox.checked).toEqual(false);
    });

    test('displays group filter dropdown button', () => {
      const { getByText } = render(<JobSelectorTable {...props} />);
      const groupDropdownButton = getByText('Group');
      expect(groupDropdownButton).toBeDefined();
    });
  });
});
