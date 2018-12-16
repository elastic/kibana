/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore No typings for EuiSearchBar
import { EuiSearchBar } from '@elastic/eui';
import React from 'react';
import { Query } from 'react-apollo';
import { getFilterBarQuery } from './get_filter_bar';

interface FilterBarProps {
  dateRangeStart: number;
  dateRangeEnd: number;
  updateQuery: (query: object) => void;
}

export const FilterBar = ({ dateRangeEnd, dateRangeStart, updateQuery }: FilterBarProps) => (
  <Query query={getFilterBarQuery} variables={{ dateRangeStart, dateRangeEnd }}>
    {({ loading, error, data }) => {
      if (loading) {
        return 'Loading...';
      }
      if (error) {
        return `Error ${error.message}`;
      }
      const {
        filterBar: { port, id, scheme },
      } = data;
      const filters = [
        {
          type: 'field_value_toggle_group',
          field: 'monitor.status',
          items: [
            {
              value: 'up',
              name: 'Up',
            },
            {
              value: 'down',
              name: 'Down',
            },
          ],
        },
        // TODO: add health to this select
        {
          type: 'field_value_selection',
          field: 'monitor.id',
          name: 'Host',
          multiSelect: 'or',
          options: id.map((idValue: string) => ({ value: idValue, view: idValue })),
        },
        {
          type: 'field_value_selection',
          field: 'tcp.port',
          name: 'Port',
          multiSelect: 'or',
          options: port.map((portValue: number) => ({ value: portValue, view: portValue })),
        },
        {
          type: 'field_value_selection',
          field: 'monitor.scheme',
          name: 'Type',
          multiSelect: 'or',
          options: scheme.map((schemeValue: string) => ({ value: schemeValue, view: schemeValue })),
        },
      ];

      return (
        <EuiSearchBar
          // TODO: update typing
          onChange={({ query }: { query?: object }) =>
            updateQuery(EuiSearchBar.Query.toESQuery(query))
          }
          filters={filters}
        />
      );
    }}
  </Query>
);
