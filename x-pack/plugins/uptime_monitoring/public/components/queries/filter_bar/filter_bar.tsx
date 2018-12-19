/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore No typings for EuiSearchBar
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSearchBar, EuiToolTip } from '@elastic/eui';
import { take } from 'lodash';
import React from 'react';
import { Query } from 'react-apollo';
import { getFilterBarQuery } from './get_filter_bar';
import { filterBarSearchSchema } from './search_schema';

interface FilterBarProps {
  dateRangeStart: number;
  dateRangeEnd: number;
  updateQuery: (query: object | undefined) => void;
}

const MAX_SELECTION_LENGTH = 20;
const SEARCH_THRESHOLD = 2;

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
      const showFilterDisclaimer =
        (id.length && id.length > MAX_SELECTION_LENGTH) ||
        (port.length && port.length > MAX_SELECTION_LENGTH);

      // TODO: add a factory function + type for these filter options
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
          multiSelect: false,
          options: take(id, MAX_SELECTION_LENGTH).map((idValue: any) => ({
            value: idValue,
            view: idValue,
          })),
          searchThreshold: SEARCH_THRESHOLD,
        },
        {
          type: 'field_value_selection',
          field: 'tcp.port',
          name: 'Port',
          multiSelect: false,
          options: take(port, MAX_SELECTION_LENGTH).map((portValue: any) => ({
            value: portValue,
            view: portValue,
          })),
          searchThreshold: SEARCH_THRESHOLD,
        },
        {
          type: 'field_value_selection',
          field: 'monitor.scheme',
          name: 'Type',
          multiSelect: false,
          options: scheme.map((schemeValue: string) => ({ value: schemeValue, view: schemeValue })),
          searchThreshold: SEARCH_THRESHOLD,
        },
      ];

      return (
        <EuiFlexGroup>
          <EuiFlexItem grow>
            <EuiSearchBar
              // TODO: update typing
              onChange={({ query }: { query?: { text: string } }) => {
                try {
                  let esQuery;
                  if (query && query.text) {
                    esQuery = EuiSearchBar.Query.toESQuery(query);
                  }
                  updateQuery(esQuery);
                } catch (e) {
                  updateQuery(undefined);
                }
              }}
              filters={filters}
              schema={filterBarSearchSchema}
            />
          </EuiFlexItem>
          {showFilterDisclaimer && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="left"
                title="Filter limitations"
                content={`The top ${MAX_SELECTION_LENGTH} filter options for each field are displayed, but you can modify the filters manually or search for additional values.`}
              >
                <EuiIcon type="iInCircle" size="l" />
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    }}
  </Query>
);
