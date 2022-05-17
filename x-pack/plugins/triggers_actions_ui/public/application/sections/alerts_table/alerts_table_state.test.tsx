/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import { AlertsField, AlertsTableConfigurationRegistry } from '../../../types';
import { PLUGIN_ID } from '../../../common/constants';
import { TypeRegistry } from '../../type_registry';
import AlertsTableState from './alerts_table_state';
import { useFetchAlerts } from './hooks/use_fetch_alerts';
import { DefaultSort } from './hooks';

jest.mock('./hooks/use_fetch_alerts');
jest.mock('@kbn/kibana-utils-plugin/public');

const columns = [
  {
    id: AlertsField.name,
    displayAsText: 'Name',
  },
  {
    id: AlertsField.reason,
    displayAsText: 'Reason',
  },
];

const alerts = [
  {
    [AlertsField.name]: ['one'],
    [AlertsField.reason]: ['two'],
  },
  {
    [AlertsField.name]: ['three'],
    [AlertsField.reason]: ['four'],
  },
] as unknown as EcsFieldsResponse[];

const hasMock = jest.fn().mockImplementation((plugin: string) => {
  return plugin === PLUGIN_ID;
});
const getMock = jest.fn().mockImplementation((plugin: string) => {
  if (plugin === PLUGIN_ID) {
    return { columns, sort: DefaultSort };
  }
  return {};
});
const alertsTableConfigurationRegistryMock = {
  has: hasMock,
  get: getMock,
} as unknown as TypeRegistry<AlertsTableConfigurationRegistry>;

const storageMock = Storage as jest.Mock;

storageMock.mockImplementation(() => {
  return { get: jest.fn(), set: jest.fn() };
});

const hookUseFetchAlerts = useFetchAlerts as jest.Mock;
hookUseFetchAlerts.mockImplementation(() => [
  false,
  {
    alerts,
    isInitializing: false,
    getInspectQuery: jest.fn(),
    refetch: jest.fn(),
    totalAlerts: alerts.length,
  },
]);

describe('AlertsTableState', () => {
  const tableProps = {
    alertsTableConfigurationRegistry: alertsTableConfigurationRegistryMock,
    configurationId: PLUGIN_ID,
    id: `test-alerts`,
    featureIds: [AlertConsumers.LOGS],
    query: {},
  };

  beforeEach(() => {
    hasMock.mockClear();
    getMock.mockClear();
  });

  describe('Alerts table configuration registry', () => {
    it('should read the configuration from the registry', async () => {
      render(<AlertsTableState {...tableProps} />);
      expect(hasMock).toHaveBeenCalledWith(PLUGIN_ID);
      expect(getMock).toHaveBeenCalledWith(PLUGIN_ID);
    });

    it('should render an empty error state when the plugin id owner is not registered', async () => {
      const props = { ...tableProps, configurationId: 'none' };
      const result = render(<AlertsTableState {...props} />);
      expect(result.getByTestId('alertsTableNoConfiguration')).toBeTruthy();
    });
  });
});
