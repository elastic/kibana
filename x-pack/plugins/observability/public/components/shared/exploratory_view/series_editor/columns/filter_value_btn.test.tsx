/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { FilterValueButton } from './filter_value_btn';
import { mockUseSeriesFilter, mockUseValuesList, render } from '../../rtl_helpers';
import {
  USER_AGENT_NAME,
  USER_AGENT_VERSION,
} from '../../configurations/constants/elasticsearch_fieldnames';

describe('FilterValueButton', function () {
  it('renders', async () => {
    render(
      <FilterValueButton
        field={USER_AGENT_NAME}
        seriesId={'series-id'}
        value={'Chrome'}
        isNestedOpen={{ value: '', negate: false }}
        setIsNestedOpen={jest.fn()}
        negate={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Chrome')).toBeInTheDocument();
    });
  });

  it('renders the negate state', async () => {
    render(
      <FilterValueButton
        field={USER_AGENT_NAME}
        seriesId={'series-id'}
        value={'Chrome'}
        isNestedOpen={{ value: '', negate: false }}
        setIsNestedOpen={jest.fn()}
        negate={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Not Chrome')).toBeInTheDocument();
      expect(screen.getByTitle('Not Chrome')).toBeInTheDocument();
      const btn = screen.getByRole('button');
      expect(btn.classList).toContain('euiButtonEmpty--danger');
    });
  });

  it('calls setFilter on click', async () => {
    const { setFilter, removeFilter } = mockUseSeriesFilter();

    render(
      <FilterValueButton
        field={USER_AGENT_NAME}
        seriesId={'series-id'}
        value={'Chrome'}
        isNestedOpen={{ value: '', negate: false }}
        setIsNestedOpen={jest.fn()}
        negate={true}
        allSelectedValues={['Firefox']}
      />
    );

    fireEvent.click(screen.getByText('Not Chrome'));

    await waitFor(() => {
      expect(removeFilter).toHaveBeenCalledTimes(0);
      expect(setFilter).toHaveBeenCalledTimes(1);

      expect(setFilter).toHaveBeenCalledWith({
        field: 'user_agent.name',
        negate: true,
        value: 'Chrome',
      });
    });
  });

  describe('when already selected', () => {
    it('removes the filter on click', async () => {
      const { removeFilter } = mockUseSeriesFilter();

      render(
        <FilterValueButton
          field={USER_AGENT_NAME}
          seriesId={'series-id'}
          value={'Chrome'}
          isNestedOpen={{ value: '', negate: false }}
          setIsNestedOpen={jest.fn()}
          negate={false}
          allSelectedValues={['Chrome', 'Firefox']}
        />
      );

      fireEvent.click(screen.getByText('Chrome'));

      await waitFor(() => {
        expect(removeFilter).toHaveBeenCalledWith({
          field: 'user_agent.name',
          negate: false,
          value: 'Chrome',
        });
      });
    });
  });

  describe('when negated', () => {
    it('changes the filter on click', async () => {
      const { removeFilter } = mockUseSeriesFilter();

      render(
        <FilterValueButton
          field={USER_AGENT_NAME}
          seriesId={'series-id'}
          value={'Chrome'}
          isNestedOpen={{ value: '', negate: false }}
          setIsNestedOpen={jest.fn()}
          negate={true}
          allSelectedValues={['Chrome', 'Firefox']}
        />
      );

      fireEvent.click(screen.getByText('Not Chrome'));

      await waitFor(() => {
        expect(removeFilter).toHaveBeenCalledWith({
          field: 'user_agent.name',
          negate: true,
          value: 'Chrome',
        });
      });
    });
  });

  it('forces open nested', async () => {
    mockUseSeriesFilter();
    const { spy } = mockUseValuesList();

    render(
      <FilterValueButton
        field={USER_AGENT_NAME}
        seriesId={'series-id'}
        value={'Chrome'}
        isNestedOpen={{ value: 'Chrome', negate: false }}
        setIsNestedOpen={jest.fn()}
        negate={false}
        allSelectedValues={['Chrome', 'Firefox']}
        nestedField={USER_AGENT_VERSION}
      />
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toBeCalledWith(
        expect.objectContaining({
          filters: [
            {
              term: {
                [USER_AGENT_NAME]: 'Chrome',
              },
            },
          ],
          sourceField: 'user_agent.version',
        })
      );
    });
  });

  it('sets isNestedOpen on click', async () => {
    mockUseSeriesFilter();
    const { spy } = mockUseValuesList();

    render(
      <FilterValueButton
        field={USER_AGENT_NAME}
        seriesId={'series-id'}
        value={'Chrome'}
        isNestedOpen={{ value: 'Chrome', negate: false }}
        setIsNestedOpen={jest.fn()}
        negate={false}
        allSelectedValues={['Chrome', 'Firefox']}
        nestedField={USER_AGENT_VERSION}
      />
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(6);
      expect(spy).toBeCalledWith(
        expect.objectContaining({
          filters: [
            {
              term: {
                [USER_AGENT_NAME]: 'Chrome',
              },
            },
          ],
          sourceField: USER_AGENT_VERSION,
        })
      );
    });
  });

  describe('when a selected item is clicked', () => {
    it('calls setIsNestedOpen', async () => {
      mockUseSeriesFilter();
      mockUseValuesList();

      const setIsNestedOpen = jest.fn();

      render(
        <FilterValueButton
          field={USER_AGENT_NAME}
          seriesId={'series-id'}
          value={'Chrome'}
          isNestedOpen={{ value: '', negate: false }}
          setIsNestedOpen={setIsNestedOpen}
          negate={false}
          allSelectedValues={['Chrome', 'Firefox']}
          nestedField={USER_AGENT_VERSION}
        />
      );

      fireEvent.click(screen.getByText('Chrome'));
      await waitFor(() => {
        expect(setIsNestedOpen).toHaveBeenCalledTimes(1);
        expect(setIsNestedOpen).toHaveBeenCalledWith({ negate: false, value: '' });
      });
    });
  });

  describe('when a non-selected item is clicked', () => {
    it('calls setIsNestedOpen', async function () {
      mockUseSeriesFilter();
      mockUseValuesList();

      const setIsNestedOpen = jest.fn();

      render(
        <FilterValueButton
          field={USER_AGENT_NAME}
          seriesId={'series-id'}
          value={'Chrome'}
          isNestedOpen={{ value: '', negate: true }}
          setIsNestedOpen={setIsNestedOpen}
          negate={true}
          allSelectedValues={['Firefox']}
          nestedField={USER_AGENT_VERSION}
        />
      );

      fireEvent.click(screen.getByText('Not Chrome'));
      await waitFor(() => {
        expect(setIsNestedOpen).toHaveBeenCalledTimes(1);
        expect(setIsNestedOpen).toHaveBeenCalledWith({ negate: true, value: 'Chrome' });
      });
    });
  });
});
