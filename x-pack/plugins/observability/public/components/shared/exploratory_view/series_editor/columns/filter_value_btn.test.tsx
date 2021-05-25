/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { FilterValueButton } from './filter_value_btn';
import { mockUseSeriesFilter, mockUseValuesList, render } from '../../rtl_helpers';
import {
  USER_AGENT_NAME,
  USER_AGENT_VERSION,
} from '../../configurations/constants/elasticsearch_fieldnames';

describe('FilterValueButton', function () {
  it('should render properly', async function () {
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

    screen.getByText('Chrome');
  });

  it('should render display negate state', async function () {
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

    screen.getByText('Not Chrome');
    screen.getByTitle('Not Chrome');
    const btn = screen.getByRole('button');
    expect(btn.classList).toContain('euiButtonEmpty--danger');
  });

  it('should call set filter on click', async function () {
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

    expect(removeFilter).toHaveBeenCalledTimes(0);
    expect(setFilter).toHaveBeenCalledTimes(1);

    expect(setFilter).toHaveBeenCalledWith({
      field: 'user_agent.name',
      negate: true,
      value: 'Chrome',
    });
  });
  it('should remove filter on click if already selected', async function () {
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

    expect(removeFilter).toHaveBeenCalledWith({
      field: 'user_agent.name',
      negate: false,
      value: 'Chrome',
    });
  });

  it('should change filter on negated one', async function () {
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

    expect(removeFilter).toHaveBeenCalledWith({
      field: 'user_agent.name',
      negate: true,
      value: 'Chrome',
    });
  });

  it('should force open nested', async function () {
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

    expect(spy).toHaveBeenCalledTimes(1);
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
  it('should set isNestedOpen on click', async function () {
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
        sourceField: USER_AGENT_VERSION,
      })
    );
  });

  it('should set call setIsNestedOpen on click selected', async function () {
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

    expect(setIsNestedOpen).toHaveBeenCalledTimes(1);
    expect(setIsNestedOpen).toHaveBeenCalledWith({ negate: false, value: '' });
  });

  it('should set call setIsNestedOpen on click not selected', async function () {
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

    expect(setIsNestedOpen).toHaveBeenCalledTimes(1);
    expect(setIsNestedOpen).toHaveBeenCalledWith({ negate: true, value: 'Chrome' });
  });
});
