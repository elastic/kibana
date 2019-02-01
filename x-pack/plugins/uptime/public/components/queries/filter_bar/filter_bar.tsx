/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore No typings for EuiSearchBar
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSearchBar, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Query } from 'react-apollo';
import { FilterBar as FilterBarType } from '../../../../common/graphql/types';
import { UptimeCommonProps } from '../../../uptime_app';
import { getFilterBarQuery } from './get_filter_bar';
import { filterBarSearchSchema } from './search_schema';

interface FilterBarProps {
  updateQuery: (query: object | undefined) => void;
}

type Props = FilterBarProps & UptimeCommonProps;

const SEARCH_THRESHOLD = 8;

export const FilterBar = ({
  autorefreshInterval,
  autorefreshIsPaused,
  dateRangeStart,
  dateRangeEnd,
  updateQuery,
}: Props) => (
  <Query
    pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
    query={getFilterBarQuery}
    variables={{ dateRangeStart, dateRangeEnd }}
  >
    {({ loading, error, data }) => {
      if (loading) {
        return i18n.translate('xpack.uptime.filterBar.loadingMessage', {
          defaultMessage: 'Loading…',
        });
      }
      if (error) {
        return i18n.translate('xpack.uptime.filterBar.errorMessage', {
          values: { message: error.message },
          defaultMessage: 'Error {message}',
        });
      }
      const {
        filterBar: { port, id, scheme },
      }: { filterBar: FilterBarType } = data;

      // TODO: add a factory function + type for these filter options
      const filters = [
        {
          type: 'field_value_toggle_group',
          field: 'monitor.status',
          items: [
            {
              value: 'up',
              name: i18n.translate('xpack.uptime.filterBar.filterUpLabel', {
                defaultMessage: 'Up',
              }),
            },
            {
              value: 'down',
              name: i18n.translate('xpack.uptime.filterBar.filterDownLabel', {
                defaultMessage: 'Down',
              }),
            },
          ],
        },
        // TODO: add health to this select
        {
          type: 'field_value_selection',
          field: 'monitor.id',
          name: i18n.translate('xpack.uptime.filterBar.options.hostLabel', {
            defaultMessage: 'Host',
          }),
          multiSelect: false,
          options: id
            ? id.map((idValue: any) => ({
                value: idValue,
                view: idValue,
              }))
            : [],
          searchThreshold: SEARCH_THRESHOLD,
        },
        {
          type: 'field_value_selection',
          field: 'tcp.port',
          name: i18n.translate('xpack.uptime.filterBar.options.portLabel', {
            defaultMessage: 'Port',
          }),
          multiSelect: false,
          options: port
            ? port.map((portValue: any) => ({
                value: portValue,
                view: portValue,
              }))
            : [],
          searchThreshold: SEARCH_THRESHOLD,
        },
        {
          type: 'field_value_selection',
          field: 'monitor.scheme',
          name: i18n.translate('xpack.uptime.filterBar.options.typeLabel', {
            defaultMessage: 'Type',
          }),
          multiSelect: false,
          options: scheme
            ? scheme.map((schemeValue: string) => ({ value: schemeValue, view: schemeValue }))
            : [],
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
        </EuiFlexGroup>
      );
    }}
  </Query>
);
