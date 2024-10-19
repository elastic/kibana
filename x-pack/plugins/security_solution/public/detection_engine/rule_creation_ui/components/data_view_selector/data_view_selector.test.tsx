/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import { TestProviders, useFormFieldMock } from '../../../../common/mock';
import { DataViewSelector } from './data_view_selector';
import { useDataViews } from './use_data_views';

jest.mock('../../../../common/lib/kibana');
jest.mock('./use_data_views');

describe('data_view_selector', () => {
  it('renders correctly', () => {
    (useDataViews as jest.Mock).mockReturnValue([]);

    render(
      <DataViewSelector
        field={useFormFieldMock<string | undefined>({
          value: undefined,
        })}
      />,
      { wrapper: TestProviders }
    );

    expect(screen.queryByTestId('pick-rule-data-source')).toBeInTheDocument();
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
    (useDataViews as jest.Mock).mockReturnValue(dataViews);

    render(
      <DataViewSelector
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
    (useDataViews as jest.Mock).mockReturnValue(dataViews);

    render(
      <DataViewSelector
        field={useFormFieldMock<string | undefined>({
          value: '1234',
        })}
      />,
      { wrapper: TestProviders }
    );

    expect(screen.queryByTestId('defaultSecurityDataViewWarning')).not.toBeInTheDocument();
  });
});
