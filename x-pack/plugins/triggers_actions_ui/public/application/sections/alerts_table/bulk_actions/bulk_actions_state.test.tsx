/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { of } from 'rxjs';
import { render } from '@testing-library/react';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import { AlertsField, AlertsTableConfigurationRegistry } from '../../../../types';
import { PLUGIN_ID } from '../../../../common/constants';
import { TypeRegistry } from '../../../type_registry';
import AlertsTableState from '../alerts_table_state';
import { FetchAlertResp, useFetchAlerts } from '../hooks/use_fetch_alerts';
import { useKibana } from '../../../../common/lib/kibana';
import { IKibanaSearchResponse } from '@kbn/data-plugin/public';

jest.mock('@kbn/kibana-utils-plugin/public');
jest.mock('../../../../common/lib/kibana');

const searchResponse = {
  id: '0',
  rawResponse: {
    took: 1,
    timed_out: false,
    _shards: {
      total: 2,
      successful: 2,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: 2,
      max_score: 1,
      hits: [
        {
          _index: '.internal.alerts-security.alerts-default-000001',
          _id: '38dd308706a127696cc63b8f142e8e4d66f8f79bc7d491dd79a42ea4ead62dd1',
          _score: 1,
          fields: {
            'kibana.alert.severity': ['low'],
            'process.name': ['iexlorer.exe'],
            '@timestamp': ['2022-03-22T16:48:07.518Z'],
            'kibana.alert.risk_score': [21],
            'kibana.alert.rule.name': ['test'],
            'user.name': ['5qcxz8o4j7'],
            'kibana.alert.name': ['one'],
            'kibana.alert.reason': [
              'registry event with process iexlorer.exe, by 5qcxz8o4j7 on Host-4dbzugdlqd created low alert test.',
            ],
            'host.name': ['Host-4dbzugdlqd'],
          },
        },
        {
          _index: '.internal.alerts-security.alerts-default-000001',
          _id: '8361363c0db6f30ca2dfb4aeb4835e7d6ec57bc195b96d9ee5a4ead1bb9f8b86',
          _score: 1,
          fields: {
            'kibana.alert.severity': ['low'],
            'process.name': ['iexlorer.exe'],
            '@timestamp': ['2022-03-22T16:17:50.769Z'],
            'kibana.alert.risk_score': [21],
            'kibana.alert.rule.name': ['test'],
            'user.name': ['hdgsmwj08h'],
            'kibana.alert.name': ['two'],
            'kibana.alert.reason': [
              'network event with process iexlorer.exe, by hdgsmwj08h on Host-4dbzugdlqd created low alert test.',
            ],
            'host.name': ['Host-4dbzugdlqd'],
          },
        },
      ],
    },
  },
  isPartial: false,
  isRunning: false,
  total: 2,
  loaded: 2,
  isRestored: false,
};

const searchResponse$ = of<IKibanaSearchResponse>(searchResponse);

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

// const alerts = [
//   {
//     [AlertsField.name]: ['one'],
//     [AlertsField.reason]: ['two'],
//   },
//   {
//     [AlertsField.name]: ['three'],
//     [AlertsField.reason]: ['four'],
//   },
// ] as unknown as EcsFieldsResponse[];

const hasMock = jest.fn().mockImplementation((plugin: string) => {
  return plugin === PLUGIN_ID;
});

const getMock = jest.fn().mockImplementation((plugin: string) => {
  if (plugin === PLUGIN_ID) {
    return {
      columns,
    };
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

describe('AlertsTableState', () => {
  const dataSearchMock = useKibana().services.data.search.search as jest.Mock;
  dataSearchMock.mockReturnValue(searchResponse$);

  const tableProps = {
    alertsTableConfigurationRegistry: alertsTableConfigurationRegistryMock,
    configurationId: PLUGIN_ID,
    id: `test-alerts`,
    featureIds: [AlertConsumers.LOGS],
    query: {},
    showExpandToDetails: true,
    pageSize: 1,
  };

  beforeEach(() => {
    hasMock.mockClear();
    getMock.mockClear();
  });

  describe('Alerts table configuration registry', () => {
    it('should read the configuration from the registry', async () => {
      const { debug, getAllByTestId } = render(<AlertsTableState {...tableProps} />);
      debug(undefined, 300000);
      const bulkActionsCells = getAllByTestId('bulk-actions-row-cell') as HTMLInputElement[];
      console.log(bulkActionsCells);
      expect(true).toBe(false);
    });
  });
});
