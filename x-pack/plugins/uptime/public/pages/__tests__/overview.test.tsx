/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { OverviewPageComponent } from '../overview';
import { shallowWithRouter } from '../../lib';

describe('MonitorPage', () => {
  const indexPattern = {
    fields: [
      {
        name: '@timestamp',
        type: 'date',
        esTypes: ['date'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },

      {
        name: 'monitor.check_group',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
      {
        name: 'monitor.duration.us',
        type: 'number',
        esTypes: ['long'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
      {
        name: 'monitor.id',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
      {
        name: 'monitor.ip',
        type: 'ip',
        esTypes: ['ip'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
      {
        name: 'monitor.name',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
      {
        name: 'monitor.status',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
      {
        name: 'monitor.timespan',
        type: 'unknown',
        esTypes: ['date_range'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
      {
        name: 'monitor.type',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
    ],
    title: 'heartbeat-8*',
  };

  const autocomplete = {
    getQuerySuggestions: jest.fn(),
    hasQuerySuggestions: () => true,
    getValueSuggestions: jest.fn(),
    addQuerySuggestionProvider: jest.fn(),
  };

  it('shallow renders expected elements for valid props', () => {
    expect(
      shallowWithRouter(
        <OverviewPageComponent
          autocomplete={autocomplete}
          indexPattern={indexPattern}
          setEsKueryFilters={jest.fn()}
        />
      )
    ).toMatchSnapshot();
  });
});
