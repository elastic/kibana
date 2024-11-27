/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import { TestProviders, useFormFieldMock } from '../../../../common/mock';
import { DataViewSelectorField } from './data_view_selector_field';
import { useDataViewListItems } from './use_data_view_list_items';

jest.mock('../../../../common/lib/kibana');
jest.mock('./use_data_view_list_items');

describe('data_view_selector', () => {
  it('renders correctly', () => {
    (useDataViewListItems as jest.Mock).mockReturnValue({ data: [], isFetching: false });

    render(
      <DataViewSelectorField
        field={useFormFieldMock<string | undefined>({
          value: undefined,
        })}
      />,
      { wrapper: TestProviders }
    );

    expect(screen.queryByTestId('pick-rule-data-source')).toBeInTheDocument();
  });

  it('disables the combobox while data views are fetching', () => {
    (useDataViewListItems as jest.Mock).mockReturnValue({ data: [], isFetching: true });

    render(
      <DataViewSelectorField
        field={useFormFieldMock<string | undefined>({
          value: undefined,
        })}
      />,
      { wrapper: TestProviders }
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('displays alerts on alerts warning when default security view selected', () => {
    const dataViews = [
      {
        id: 'security-solution-default',
        title:
          '-*elastic-cloud-logs-*,.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*',
      },
      {
        id: '1234',
        title: 'logs-*',
      },
    ];
    (useDataViewListItems as jest.Mock).mockReturnValue({ data: dataViews, isFetching: false });

    render(
      <DataViewSelectorField
        field={useFormFieldMock<string | undefined>({
          value: 'security-solution-default',
        })}
      />,
      { wrapper: TestProviders }
    );

    expect(screen.queryByTestId('defaultSecurityDataViewWarning')).toBeInTheDocument();
  });

  it('does not display alerts on alerts warning when default security view is not selected', () => {
    const dataViews = [
      {
        id: 'security-solution-default',
        title:
          '-*elastic-cloud-logs-*,.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*',
      },
      {
        id: '1234',
        title: 'logs-*',
      },
    ];
    (useDataViewListItems as jest.Mock).mockReturnValue({ data: dataViews, isFetching: false });

    render(
      <DataViewSelectorField
        field={useFormFieldMock<string | undefined>({
          value: '1234',
        })}
      />,
      { wrapper: TestProviders }
    );

    expect(screen.queryByTestId('defaultSecurityDataViewWarning')).not.toBeInTheDocument();
  });

  it('displays warning on missing data view', () => {
    (useDataViewListItems as jest.Mock).mockReturnValue({ data: [], isFetching: false });

    render(
      <DataViewSelectorField
        field={useFormFieldMock<string | undefined>({
          value: 'non-existent-id',
        })}
      />,
      { wrapper: TestProviders }
    );

    expect(screen.queryByTestId('missingDataViewWarning')).toBeInTheDocument();
  });
});
