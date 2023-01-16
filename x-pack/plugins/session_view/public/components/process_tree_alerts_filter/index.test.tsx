/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mockAlertTypeCounts } from '../../../common/mocks/constants/session_view_process.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { ProcessTreeAlertsFilter, ProcessTreeAlertsFilterDeps } from '.';
import userEvent from '@testing-library/user-event';
import { DEFAULT_ALERT_FILTER_VALUE } from '../../../common/constants';

describe('ProcessTreeAlertsFiltersFilter component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  const props: ProcessTreeAlertsFilterDeps = {
    totalAlertsCount: 3,
    alertTypeCounts: mockAlertTypeCounts,
    filteredAlertsCount: 2,
    onAlertEventCategorySelected: jest.fn(),
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When ProcessTreeAlertsFiltersFilter is mounted', () => {
    it('should filter alerts count of out total alerts count when filtered alerts count and total alerts count are not equal', async () => {
      renderResult = mockedContext.render(<ProcessTreeAlertsFilter {...props} />);

      const filterCountStatus = renderResult.queryByTestId(
        'sessionView:sessionViewAlertDetailsFilterStatus'
      );

      expect(filterCountStatus).toBeTruthy();
      expect(filterCountStatus).toHaveTextContent('Showing 2 of 3 alerts');
    });

    it('should show only total alert counts when filtered  and total count are equal', async () => {
      renderResult = mockedContext.render(
        <ProcessTreeAlertsFilter {...props} filteredAlertsCount={3} />
      );

      const filterCountStatus = renderResult.queryByTestId(
        'sessionView:sessionViewAlertDetailsFilterStatus'
      );

      expect(filterCountStatus).toHaveTextContent('Showing 3 alerts');
      expect(filterCountStatus).not.toHaveTextContent('Showing 2 of 3 alerts');
      expect(filterCountStatus).toBeTruthy();
    });

    it('should call onAlertEventCategorySelected with alert category when filter item is clicked ', () => {
      const mockAlertEventCategorySelectedEvent = jest.fn();
      renderResult = mockedContext.render(
        <ProcessTreeAlertsFilter
          {...props}
          onAlertEventCategorySelected={mockAlertEventCategorySelectedEvent}
        />
      );
      const filterButton = renderResult.getByTestId(
        'sessionView:sessionViewAlertDetailsEmptyFilterButton'
      );
      userEvent.click(filterButton);

      renderResult.getByTestId('sessionView:sessionViewAlertDetailsFilterItem-network').click();

      expect(mockAlertEventCategorySelectedEvent).toHaveBeenCalledTimes(1);
      expect(mockAlertEventCategorySelectedEvent).toHaveBeenCalledWith('network');
    });

    describe(' EuiFlexItem filter selector container ', () => {
      it('should alerts filter dropdown when at least two alerts categories exist', async () => {
        renderResult = mockedContext.render(<ProcessTreeAlertsFilter {...props} />);

        const filterSelection = renderResult.queryByTestId(
          'sessionView:sessionViewAlertDetailsFilterSelectorContainer'
        );

        expect(filterSelection).toBeTruthy();
      });

      it('should not show alerts filter selector container when there is only one alert category ', async () => {
        const alertTypeCountsUpdated = mockAlertTypeCounts.map((alertType) =>
          alertType.category === 'process' ? { ...alertType, count: 1 } : { ...alertType, count: 0 }
        );
        renderResult = mockedContext.render(
          <ProcessTreeAlertsFilter {...props} alertTypeCounts={alertTypeCountsUpdated} />
        );

        const filterSelection = renderResult.queryByTestId(
          'sessionView:sessionViewAlertDetailsFilterSelectorContainer'
        );

        expect(filterSelection).toBeNull();
      });

      it('should open filter menu popover', async () => {
        renderResult = mockedContext.render(<ProcessTreeAlertsFilter {...props} />);

        const filterButton = renderResult.getByTestId(
          'sessionView:sessionViewAlertDetailsEmptyFilterButton'
        );

        userEvent.click(filterButton);

        const filterMenu = renderResult.queryByTestId(
          'sessionView:sessionViewAlertDetailsFilterSelectorContainerMenu'
        );

        expect(filterMenu).toBeTruthy();
      });
    });

    describe('EuiContextMenuItem filter when two alert categories exists', () => {
      it('should display network option in filter menu', async () => {
        renderResult = mockedContext.render(<ProcessTreeAlertsFilter {...props} />);

        const filterButton = renderResult.getByTestId(
          'sessionView:sessionViewAlertDetailsEmptyFilterButton'
        );

        userEvent.click(filterButton);

        const filterMenuItem = renderResult.queryByTestId(
          'sessionView:sessionViewAlertDetailsFilterItem-network'
        );

        expect(filterMenuItem).toHaveTextContent('View network alerts');
        expect(filterMenuItem).toBeTruthy();
      });

      it('should display process option in filter menu', async () => {
        renderResult = mockedContext.render(<ProcessTreeAlertsFilter {...props} />);

        const filterButton = renderResult.getByTestId(
          'sessionView:sessionViewAlertDetailsEmptyFilterButton'
        );

        userEvent.click(filterButton);

        const filterMenuItem = renderResult.queryByTestId(
          'sessionView:sessionViewAlertDetailsFilterItem-process'
        );

        expect(filterMenuItem).toHaveTextContent('View process alerts');
        expect(filterMenuItem).toBeTruthy();
      });

      it('should not display file option in filter menu', async () => {
        renderResult = mockedContext.render(<ProcessTreeAlertsFilter {...props} />);

        const filterButton = renderResult.getByTestId(
          'sessionView:sessionViewAlertDetailsEmptyFilterButton'
        );

        userEvent.click(filterButton);

        const filterMenuItem = renderResult.queryByTestId(
          'sessionView:sessionViewAlertDetailsFilterItem-file'
        );

        expect(filterMenuItem).toBeNull();
      });
    });

    describe('EuiContextMenuItem  filter when all alert categories exist', () => {
      const alertTypeCountsUpdated = mockAlertTypeCounts.map((alertType) => ({
        ...alertType,
        count: 1,
      }));
      beforeEach(() => {
        renderResult = mockedContext.render(
          <ProcessTreeAlertsFilter {...props} alertTypeCounts={alertTypeCountsUpdated} />
        );
      });

      it('should display network option in filter menu', async () => {
        const filterButton = renderResult.getByTestId(
          'sessionView:sessionViewAlertDetailsEmptyFilterButton'
        );

        userEvent.click(filterButton);

        const filterMenuItem = renderResult.queryByTestId(
          'sessionView:sessionViewAlertDetailsFilterItem-network'
        );

        expect(filterMenuItem).toHaveTextContent('View network alerts');
        expect(filterMenuItem).toBeTruthy();
      });

      it('should display process option in filter menu', async () => {
        const filterButton = renderResult.getByTestId(
          'sessionView:sessionViewAlertDetailsEmptyFilterButton'
        );

        userEvent.click(filterButton);

        const filterMenuItem = renderResult.queryByTestId(
          'sessionView:sessionViewAlertDetailsFilterItem-process'
        );

        expect(filterMenuItem).toHaveTextContent('View process alerts');
        expect(filterMenuItem).toBeTruthy();
      });

      it('should display file option in filter menu', async () => {
        const filterButton = renderResult.getByTestId(
          'sessionView:sessionViewAlertDetailsEmptyFilterButton'
        );

        userEvent.click(filterButton);

        const filterMenuItem = renderResult.queryByTestId(
          'sessionView:sessionViewAlertDetailsFilterItem-file'
        );

        expect(filterMenuItem).toHaveTextContent('View file alerts');
        expect(filterMenuItem).toBeTruthy();
      });
    });

    describe('EmptyFilterButton display text', () => {
      const alertTypeCountsUpdated = mockAlertTypeCounts.map((alertType) => ({
        ...alertType,
        count: 1,
      }));

      beforeEach(() => {
        renderResult = mockedContext.render(
          <ProcessTreeAlertsFilter {...props} alertTypeCounts={alertTypeCountsUpdated} />
        );
      });
      it('should set the EmptyFilterButton text content to  display "View: all alerts"  by default ', () => {
        const filterButton = renderResult.getByTestId(
          'sessionView:sessionViewAlertDetailsEmptyFilterButton'
        );
        expect(filterButton).toHaveTextContent('View: all alerts');
      });

      it('should set the EmptyFilterButton text content to  display "View: file alerts"  when file alert option is clicked', () => {
        const filterButton = renderResult.getByTestId(
          'sessionView:sessionViewAlertDetailsEmptyFilterButton'
        );
        userEvent.click(filterButton);

        renderResult.getByTestId('sessionView:sessionViewAlertDetailsFilterItem-file').click();

        expect(filterButton).toHaveTextContent('View: file alerts');
      });

      it('should set the EmptyFilterButton text content to  display "View: all alerts"  when default filter option is clicked', () => {
        const filterButton = renderResult.getByTestId(
          'sessionView:sessionViewAlertDetailsEmptyFilterButton'
        );
        userEvent.click(filterButton);

        renderResult.getByTestId('sessionView:sessionViewAlertDetailsFilterItem-default').click();

        expect(filterButton).toHaveTextContent(`View: ${DEFAULT_ALERT_FILTER_VALUE} alerts`);
      });

      it('should set the EmptyFilterButton text content to  display "View: process alerts"  when process alert option is clicked', () => {
        const filterButton = renderResult.getByTestId(
          'sessionView:sessionViewAlertDetailsEmptyFilterButton'
        );
        userEvent.click(filterButton);

        renderResult.getByTestId('sessionView:sessionViewAlertDetailsFilterItem-process').click();

        expect(filterButton).toHaveTextContent('View: process alerts');
      });

      it('should set the EmptyFilterButton text content to  display "View: network alerts"  when network alert option is clicked', () => {
        const filterButton = renderResult.getByTestId(
          'sessionView:sessionViewAlertDetailsEmptyFilterButton'
        );
        userEvent.click(filterButton);

        renderResult.getByTestId('sessionView:sessionViewAlertDetailsFilterItem-network').click();

        expect(filterButton).toHaveTextContent('View: network alerts');
      });
    });
  });
});
